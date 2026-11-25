# Chess vs. Python

Play White against a depth-3 Negamax bot in your browser or terminal.
`chess_web.py` serves the browser interface and uses the game in `chess_game.py`.

## Run on Windows

From the project folder, create the virtual environment if you don't already
have one:

```powershell
py -3.12 -m venv .venv
```

Install dependencies and start the local web server:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe chess_web.py
```

Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser. Click a
white piece and then a highlighted square to move. Choose a piece when a pawn
promotes. **New game** resets the board, and the move history uses standard
chess notation. Each tab starts a fresh game when opened or reloaded.

Press `Ctrl+C` in the terminal to stop the server.

Prefer the terminal? Run `.\.venv\Scripts\python.exe chess_game.py` instead.
