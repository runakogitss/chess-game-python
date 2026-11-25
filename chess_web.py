import argparse
import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import chess
from easyAI import AI_Player, Human_Player, Negamax

from chess_game import ChessGame


WEB_ROOT = Path(__file__).resolve().with_name("web")


def new_game():
    return ChessGame([Human_Player(), AI_Player(Negamax(3))])


def play_move(game, moves, uci):
    if not isinstance(uci, str) or game.is_over():
        raise ValueError("This move is not legal.")
    move = game.board.parse_uci(uci)
    if not move:
        raise ValueError("This move is not legal.")
    moves.append({"uci": move.uci(), "san": game.board.san(move)})
    game.make_move(move.uci())
    game.switch_player()


def game_state(game, moves):
    board = game.board
    outcome = board.outcome()
    return {
        "pieces": {
            chess.square_name(square): piece.symbol()
            for square, piece in board.piece_map().items()
        },
        "legalMoves": game.possible_moves() if outcome is None else [],
        "moves": moves,
        "checkedKing": chess.square_name(board.king(board.turn)) if board.is_check() else None,
        "result": outcome.result() if outcome else None,
        "termination": outcome.termination.name if outcome else None,
    }


class ChessRequestHandler(SimpleHTTPRequestHandler):
    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/game":
            self.send_json(game_state(new_game(), []))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path != "/api/move":
            self.send_error(404)
            return
        if self.headers.get_content_type() != "application/json":
            self.send_json({"error": "Expected a JSON request."}, 415)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 128 * 1024:
                raise ValueError
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict) or not isinstance(data.get("history"), list):
                raise ValueError
        except ValueError:
            self.send_json({"error": "The move request was invalid."}, 400)
            return

        game = new_game()
        moves = []
        try:
            # Replay the tab's moves so repetition and castling rights stay intact.
            for uci in data["history"]:
                play_move(game, moves, uci)
            if game.board.turn != chess.WHITE:
                raise ValueError("It is White's turn in the browser.")
            play_move(game, moves, data.get("move"))
        except ValueError:
            self.send_json({"error": "That move is not legal in this position."}, 400)
            return

        if not game.is_over():
            play_move(game, moves, game.player.ask_move(game))
        self.send_json(game_state(game, moves))


def main():
    parser = argparse.ArgumentParser(description="Play chess against Python in your browser.")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    handler = partial(ChessRequestHandler, directory=str(WEB_ROOT))
    with ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Open http://127.0.0.1:{server.server_port}/ to play. Press Ctrl+C to stop.", flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
