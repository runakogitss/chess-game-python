const board = document.querySelector("#board");
const status = document.querySelector("#status");
const hint = document.querySelector("#hint");
const newGame = document.querySelector("#new-game");
const historyScroll = document.querySelector("#history-scroll");
const moveTable = document.querySelector("#moves");
const moveRows = document.querySelector("#move-rows");
const emptyHistory = document.querySelector("#empty-history");
const computer = document.querySelector("#computer");
const you = document.querySelector("#you");
const promotion = document.querySelector("#promotion");
const promotionChoices = document.querySelector("#promotion-choices");

const files = "abcdefgh";
const pieces = {
  p: ["♟︎", "pawn"],
  n: ["♞︎", "knight"],
  b: ["♝︎", "bishop"],
  r: ["♜︎", "rook"],
  q: ["♛︎", "queen"],
  k: ["♚︎", "king"],
};
const drawReasons = {
  STALEMATE: "Stalemate.",
  INSUFFICIENT_MATERIAL: "Insufficient material.",
  SEVENTYFIVE_MOVES: "Seventy-five-move rule.",
  FIVEFOLD_REPETITION: "Fivefold repetition.",
};

const squares = [];
let game = null;
let selected = null;
let tabStop = 52;
let pending = null;
let error = null;

function element(tag, className, label = "") {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = label;
  return node;
}

for (let row = 0; row < 8; row++) {
  for (let col = 0; col < 8; col++) {
    const rank = 8 - row;
    const square = `${files[col]}${rank}`;
    const button = element("button", (row + col) % 2 ? "square dark" : "square");
    button.type = "button";
    button.setAttribute("aria-label", square);
    const piece = element("span", "piece");
    piece.setAttribute("aria-hidden", "true");
    button.append(piece);
    if (col === 0) button.append(element("span", "coordinate rank", rank));
    if (row === 7) button.append(element("span", "coordinate file", files[col]));
    const index = squares.length;
    button.addEventListener("click", () => {
      tabStop = index;
      chooseSquare(square);
    });
    button.addEventListener("keydown", event => moveFocus(event, row, col));
    squares.push({ square, button, piece });
    board.append(button);
  }
}

function moveFocus(event, row, col) {
  switch (event.key) {
    case "ArrowUp": row = Math.max(0, row - 1); break;
    case "ArrowDown": row = Math.min(7, row + 1); break;
    case "ArrowLeft": col = Math.max(0, col - 1); break;
    case "ArrowRight": col = Math.min(7, col + 1); break;
    case "Escape":
      selected = null;
      renderBoard();
      return;
    default: return;
  }
  event.preventDefault();
  tabStop = row * 8 + col;
  renderBoard();
  squares[tabStop].button.focus();
}

function renderBoard() {
  const legal = pending ? [] : game?.legalMoves ?? [];
  const sources = new Set(legal.map(move => move.slice(0, 2)));
  const selectedMoves = selected ? legal.filter(move => move.startsWith(selected)) : [];
  const targets = new Set(selectedMoves.map(move => move.slice(2, 4)));
  const lastMove = game?.moves.at(-1)?.uci;

  for (const [index, { square, button, piece }] of squares.entries()) {
    const symbol = game?.pieces[square];
    const white = Boolean(symbol && symbol === symbol.toUpperCase());
    const [glyph, name] = symbol ? pieces[symbol.toLowerCase()] : ["", ""];
    piece.textContent = glyph;
    piece.classList.toggle("white", white);
    button.tabIndex = index === tabStop ? 0 : -1;
    button.setAttribute("aria-label", symbol ? `${square}, ${white ? "White" : "Black"} ${name}` : square);
    button.setAttribute("aria-pressed", String(square === selected));
    button.setAttribute("aria-disabled", String(!sources.has(square) && !targets.has(square)));
    button.classList.toggle("selected", square === selected);
    button.classList.toggle("selectable", sources.has(square));
    button.classList.toggle("destination", targets.has(square));
    button.classList.toggle("capture", targets.has(square) && Boolean(symbol));
    button.classList.toggle("last-move", square === lastMove?.slice(0, 2) || square === lastMove?.slice(2, 4));
    button.classList.toggle("checked", square === game?.checkedKing);
  }
}

function renderHistory() {
  const moves = game?.moves ?? [];
  emptyHistory.hidden = moves.length > 0;
  moveTable.hidden = moves.length === 0;
  moveRows.replaceChildren();
  for (let index = 0; index < moves.length; index += 2) {
    const row = moveRows.insertRow();
    row.insertCell().textContent = index / 2 + 1;
    row.insertCell().textContent = moves[index].san;
    row.insertCell().textContent = moves[index + 1]?.san ?? "";
  }
  historyScroll.scrollTop = historyScroll.scrollHeight;
}

function renderStatus() {
  newGame.disabled = Boolean(pending);
  computer.classList.toggle("active", pending === "move");
  you.classList.toggle("active", Boolean(game && !game.result && !pending));

  let title = "Your turn";
  let message = game?.checkedKing ? "You're in check. Choose a legal move." : "Select a piece to see where it can move.";
  if (pending === "reset") {
    title = "Loading game";
    message = "Setting up the board.";
  } else if (pending === "move") {
    title = "Computer is thinking";
    message = "Waiting for Black's reply.";
  } else if (error) {
    title = error.title;
    message = error.message;
  } else if (game?.result) {
    title = { "1-0": "You won", "0-1": "Computer won", "1/2-1/2": "Draw" }[game.result];
    message = game.termination === "CHECKMATE" ? "Checkmate." : drawReasons[game.termination] ?? "Game over.";
  }
  status.textContent = title;
  hint.textContent = message;
}

function chooseSquare(square) {
  if (!game || pending || game.result) return;

  const candidates = selected ? game.legalMoves.filter(move => move.startsWith(selected + square)) : [];
  if (candidates.length > 1) {
    promotion.returnValue = "";
    promotionChoices.replaceChildren();
    for (const move of candidates) {
      const [glyph, name] = pieces[move[4]];
      const button = element("button", "");
      button.value = move;
      button.setAttribute("aria-label", `Promote to ${name}`);
      const piece = element("span", "piece white", glyph);
      piece.setAttribute("aria-hidden", "true");
      button.append(piece);
      promotionChoices.append(button);
    }
    const cancel = element("button", "", "Cancel");
    cancel.value = "";
    promotionChoices.append(cancel);
    promotion.showModal();
  } else if (candidates.length === 1) {
    submitMove(candidates[0]);
  } else {
    const selectable = game.legalMoves.some(move => move.startsWith(square));
    selected = selectable && square !== selected ? square : null;
    renderBoard();
  }
}

async function requestGame(action, options) {
  pending = action;
  selected = null;
  error = null;
  renderBoard();
  renderStatus();
  try {
    const response = await fetch(action === "move" ? "/api/move" : "/api/game", options);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    game = await response.json();
    renderHistory();
  } catch {
    error = action === "move"
      ? { title: "Move interrupted", message: "Try the move again." }
      : { title: "Game unavailable", message: "Check that the Python server is running, then click New game." };
  } finally {
    pending = null;
    renderBoard();
    renderStatus();
  }
}

function submitMove(move) {
  requestGame("move", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history: game.moves.map(entry => entry.uci), move }),
  });
}

promotion.addEventListener("close", () => {
  if (promotion.returnValue) submitMove(promotion.returnValue);
});
newGame.addEventListener("click", () => requestGame("reset"));
requestGame("reset");
