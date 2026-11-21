import chess
from easyAI import AI_Player, Human_Player, Negamax, TwoPlayerGame


PIECE_VALUES = {
    chess.PAWN: 10,
    chess.KNIGHT: 30,
    chess.BISHOP: 30,
    chess.ROOK: 50,
    chess.QUEEN: 90,
    chess.KING: 900,
}


class ChessGame(TwoPlayerGame):
    def __init__(self, players):
        self.players = players
        self.board = chess.Board()
        self.current_player = 1

    def possible_moves(self):
        return [move.uci() for move in self.board.legal_moves]

    def make_move(self, move):
        self.board.push_uci(move)

    def unmake_move(self, move):
        self.board.pop()

    def is_over(self):
        return self.board.is_game_over()

    def show(self):
        for rank in range(7, -1, -1):
            cells = []
            for file_index in range(8):
                piece = self.board.piece_at(chess.square(file_index, rank))
                if piece is None:
                    cells.append(" .")
                else:
                    side = "w" if piece.color == chess.WHITE else "b"
                    cells.append(side + piece.symbol().upper())
            print(f"{rank + 1}  {' '.join(cells)}")
        print("    a  b  c  d  e  f  g  h")
        if not self.is_over():
            print("White to move." if self.board.turn == chess.WHITE else "Black to move.")

    def scoring(self):
        outcome = self.board.outcome()
        if outcome is not None:
            return 0 if outcome.winner is None else -10000

        score = 0
        for piece_type, value in PIECE_VALUES.items():
            score += len(self.board.pieces(piece_type, chess.WHITE)) * value
            score -= len(self.board.pieces(piece_type, chess.BLACK)) * value
        return score if self.board.turn == chess.WHITE else -score


if __name__ == "__main__":
    game = ChessGame([Human_Player(), AI_Player(Negamax(3))])
    print("You play White (w). The AI plays Black (b).")
    print("Enter a move like e2e4, 'show moves', or 'quit'.")
    try:
        game.play()
    except (KeyboardInterrupt, EOFError):
        print("\nGame ended.")
    else:
        print(f"Result: {game.board.result()}")
