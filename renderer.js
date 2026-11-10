const SIZE = 8;

let pieces = [];
let selectedPiece = null;
let currentPlayer = "white";

let gameMode = null;
let gameStarted = false;

const TURN_TIME = 60;
let timer = TURN_TIME;
let timerInterval = null;

let aiCapturing = false;

let aiDifficulty = "easy";

// Online mode state; this client is part of the separate online project.
let onlineSocket = null;
let onlineRoomCode = null;
let onlineColor = null;
let applyingRemoteState = false;
let onlineRooms = [];
// ============================
// DOM
// ============================

const board = document.getElementById("board");
const boardGrid = document.getElementById("boardGrid");
const board3d = document.getElementById("board3d");
const turnText = document.getElementById("turn");

const menu = document.getElementById("menu");
const game = document.getElementById("game");

const headerMenuBtn = document.getElementById("headerMenuBtn");
const headerLogo = document.querySelector(".header-logo");

const aiBtn = document.getElementById("aiBtn");
const twoPlayersBtn = document.getElementById("twoPlayersBtn");

const newGameBtn = document.getElementById("newGameBtn");
const menuBtn = document.getElementById("menuBtn");
const onlineBtn = document.getElementById("onlineBtn");
const onlinePanel = document.getElementById("onlinePanel");

const onlineStatus = document.getElementById("onlineStatus");
const onlineBackBtn = document.getElementById("onlineBackBtn");


const aboutPanel = document.getElementById("aboutPanel");
const aboutBackBtn = document.getElementById("aboutBackBtn");
const footerButtons = document.querySelectorAll("[data-footer-page]");
const termsPanel = document.getElementById("termsPanel");
const termsBackBtn = document.getElementById("termsBackBtn");
const privacyPanel = document.getElementById("privacyPanel");
const privacyBackBtn = document.getElementById("privacyBackBtn");
const contactPanel = document.getElementById("contactPanel");
const contactBackBtn = document.getElementById("contactBackBtn");

const footerPanels = {
  about: document.getElementById("aboutPanel"),
  terms: document.getElementById("termsPanel"),
  privacy: document.getElementById("privacyPanel"),
  contact: document.getElementById("contactPanel"),
};

contactBackBtn?.addEventListener("click", () => {
  contactPanel.style.display = "none";
  menu.style.display = "block";
});


// ============================
// КНОПКИ
// ============================

aiBtn.addEventListener("click", () => {
  showDifficultyMenu();
});

twoPlayersBtn.addEventListener("click", () => {
  onlinePanel.style.display = "none";
  startGame("two");
});

onlineBtn.addEventListener("click", () => {
  menu.style.display = "none";
  onlinePanel.style.display = "block";
  connectOnlineSocket();
});

onlineBackBtn.addEventListener("click", () => {
  if (onlineSocket && onlineRoomCode !== null) {
    onlineSocket.emit("leave-room");
    onlineSocket.emit("get-rooms");
  }

  onlineRoomCode = null;
  onlineColor = null;

  onlinePanel.style.display = "none";
  menu.style.display = "block";
});



footerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const page = button.dataset.footerPage;

    // Закриваємо всі сторінки футера
    Object.values(footerPanels).forEach((panel) => {
      if (panel) {
        panel.style.display = "none";
      }
    });

    // Закриваємо головне меню та онлайн-лобі
    menu.style.display = "none";
    onlinePanel.style.display = "none";

    // Відкриваємо лише вибрану сторінку
    const targetPanel = footerPanels[page];

    if (targetPanel) {
      targetPanel.style.display = "block";
    }
  });
});

privacyBackBtn.addEventListener("click", () => {
  privacyPanel.style.display = "none";
  menu.style.display = "block";
});

termsBackBtn.addEventListener("click", () => {
  termsPanel.style.display = "none";
  menu.style.display = "block";
});

aboutBackBtn.addEventListener("click", () => {
  aboutPanel.style.display = "none";
  menu.style.display = "block";
});





newGameBtn.addEventListener("click", () => {
  if (gameMode === "online") {
    alert(
      "To start a new online game, return to the menu and join a new room.",
    );
    return;
  }
  startGame(gameMode);
});

menuBtn.addEventListener("click", () => {
  // Return to the main menu when selecting AI difficulty
  // or leaving an AI game.
  if (!gameMode || gameMode === "ai") {
    location.reload();
    return;
  }

  stopTimer();

  if (gameMode === "online" && onlineSocket && onlineRoomCode) {
    onlineSocket.emit("leave-room");
  }

  gameStarted = false;
  selectedPiece = null;
  aiCapturing = false;
  onlineColor = null;
  onlineRoomCode = null;

  game.style.display = "none";
  menu.style.display = "block";
});


headerMenuBtn.addEventListener("click", () => {
  menuBtn.click();

  aboutPanel.style.display = "none";
  onlinePanel.style.display = "none";
  termsPanel.style.display = "none";
  privacyPanel.style.display = "none";
  contactPanel.style.display = "none";

  menu.style.display = "block";
});

headerLogo?.addEventListener("click", () => {
  menuBtn.click();

  aboutPanel.style.display = "none";
  onlinePanel.style.display = "none";
  termsPanel.style.display = "none";
  privacyPanel.style.display = "none";
  contactPanel.style.display = "none";

  menu.style.display = "block";
});

// ============================
// МЕНЮ СКЛАДНОСТІ
// ============================

function showDifficultyMenu() {
  menu.innerHTML = `
    <div class="difficulty-menu">
      <h2>Select Difficulty</h2>

      <button id="easyBtn">🟢 Easy</button>
      <button id="mediumBtn">🟡 Medium</button>
      <button id="hardBtn">🔴 Hard</button>
      <button id="backBtn">← Back</button>
    </div>
  `;

  document.getElementById("easyBtn").addEventListener("click", () => {
    selectDifficulty("easy");
  });

  document.getElementById("mediumBtn").addEventListener("click", () => {
    selectDifficulty("medium");
  });

  document.getElementById("hardBtn").addEventListener("click", () => {
    selectDifficulty("hard");
  });

  document.getElementById("backBtn").addEventListener("click", () => {
    location.reload();
  });
}


// ============================
// ФУНКЦІЯ ВИБОРУ
// ============================
function selectDifficulty(level) {
  aiDifficulty = level;

  startGame("ai");
}
// ============================
// ПОЧАТОК ГРИ
// ============================

function startGame(mode) {
  gameMode = mode;
  init3DScene();
  gameStarted = true;

  menu.style.display = "none";
  game.style.display = "block";

  currentPlayer = "white";
  selectedPiece = null;
  aiCapturing = false;

  // Start each mode from the white side. Only two-player mode will auto-flip
  // the camera on subsequent turns; AI mode keeps the user's chosen view.
  focusCameraOnTurn(
  gameMode === "online" && onlineColor ? onlineColor : "white",
    true,
  );

  createPieces();
  renderPieces();

  updateTurn();

  startTimer();
}







function renderPieces() {
  createBoard();
  if (scene3D) render3D();
}



// ============================
// КЛІК ПО КЛІТИНЦІ
// ============================

function handleCellClick(row, col) {
  console.log("HANDLE CELL", {
    row,
    col,
    gameMode,
    onlineColor,
    currentPlayer,
  });

  if (gameMode === "online" && onlineColor !== currentPlayer) {
    console.log("BLOCKED: NOT YOUR TURN");
    return;
  }

  // Людина не може керувати чорними
  // під час гри проти AI
  if (gameMode === "ai" && currentPlayer === "black") {
    return;
  }

  // Якщо вже вибрана шашка
  if (selectedPiece) {
    if (isPossibleMove(row, col)) {
      movePiece(row, col);

      return;
    }
  }

  // Якщо натиснули на іншу шашку
  const piece = getPiece(row, col);

  if (piece && piece.color === currentPlayer) {
    // Якщо є обов'язкове взяття
    if (hasAnyCapture(currentPlayer)) {
      const captures = getCaptures(piece);

      if (captures.length === 0) {
        return;
      }
    }

    selectPiece(piece);
  }
}

// ============================
// ВИБІР ШАШКИ
// ============================

function selectPiece(piece) {
  if (piece.color !== currentPlayer) {
    return;
  }

  selectedPiece = piece;

  showPossibleMoves(piece);
}

// ============================
// ПОКАЗ МОЖЛИВИХ ХОДІВ
// ============================

function showPossibleMoves(piece) {
  renderPieces();

  const captures = getCaptures(piece);

  // Якщо є взяття
  if (captures.length > 0) {
    captures.forEach((move) => {
      const cell = getCell(move.row, move.col);
      if (cell) cell.classList.add("possible");
    });
    render3D();
    return;
  }

  // Якщо взяття існує в іншому місці
  if (hasAnyCapture(currentPlayer)) {
    render3D();
    return;
  }

  // ============================
  // ДАМКА
  // ============================

  if (piece.king) {
    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    directions.forEach(([dr, dc]) => {
      let row = piece.row + dr;
      let col = piece.col + dc;

      while (isInside(row, col)) {
        if (getPiece(row, col)) {
          break;
        }

        const cell = getCell(row, col);

        if (cell) {
          cell.classList.add("possible");
        }

        row += dr;
        col += dc;
      }
    });
    render3D();
    return;
  }

  // ============================
  // ЗВИЧАЙНА ШАШКА
  // ============================

  const direction = piece.color === "white" ? -1 : 1;

  const moves = [
    [direction, -1],
    [direction, 1],
  ];

  moves.forEach(([dr, dc]) => {
    const row = piece.row + dr;

    const col = piece.col + dc;

    if (isInside(row, col) && !getPiece(row, col)) {
      const cell = getCell(row, col);

      if (cell) {
        cell.classList.add("possible");
      }
    }
  });
  render3D();
}





// ============================
// ХІД
// ============================

function movePiece(row, col) {
  const captures = getCaptures(selectedPiece);

  const capture = captures.find((move) => move.row === row && move.col === col);

  // ============================
  // ВИДАЛЯЄМО ВЗЯТУ ШАШКУ
  // ============================

  if (capture) {
    pieces = pieces.filter((piece) => piece !== capture.enemy);
  }

  // ============================
  // ПЕРЕМІЩЕННЯ
  // ============================

  selectedPiece.row = row;
  selectedPiece.col = col;

  // Звук кожного переміщення
  playMoveSound(!!capture);

  // ============================
  // ПЕРЕТВОРЕННЯ НА ДАМКУ
  // ============================

  if (selectedPiece.color === "white" && selectedPiece.row === 0) {
    selectedPiece.king = true;
  }

  if (selectedPiece.color === "black" && selectedPiece.row === SIZE - 1) {
    selectedPiece.king = true;
  }

  // ============================
  // НАСТУПНЕ ВЗЯТТЯ
  // ============================

  if (capture) {
    const nextCaptures = getCaptures(selectedPiece);

    if (nextCaptures.length > 0) {
      // ============================
      // AI ПРОДОВЖУЄ ВЗЯТТЯ
      // ============================

      if (gameMode === "ai" && currentPlayer === "black") {
        aiCapturing = true;

        renderPieces();

        setTimeout(() => {
          aiMove();
        }, 500);

        return;
      }

      // ============================
      // ЛЮДИНА ПРОДОВЖУЄ ВЗЯТТЯ
      // ============================

      renderPieces();

      showPossibleMoves(selectedPiece);

      return;
    }
  }

  // ============================
  // AI БІЛЬШЕ НЕ Б'Є
  // ============================

  aiCapturing = false;

  // ============================
  // ЗАКІНЧУЄМО ХІД
  // ============================

  selectedPiece = null;

  changeTurn();

  startTimer();

  renderPieces();

  checkWinner();

  if (
    gameMode === "online" &&
    onlineSocket &&
    onlineRoomCode &&
    !applyingRemoteState
  ) {
    onlineSocket.emit("game-state", {
      state: serializeOnlineState(),
    });
  }

  // ============================
  // ХІД AI
  // ============================

  if (gameMode === "ai" && currentPlayer === "black" && gameStarted) {
    setTimeout(() => {
      aiMove();
    }, 500);
  }
}





// ============================
// ОНОВИТИ ТЕКСТ ХОДУ
// ============================


function updateTurn() {
  turnText.textContent = currentPlayer === "white" ? "White" : "Black";

  // In two-player mode, the camera follows the current player.
  // In online mode, the camera stays on the local player's side.
  // In AI mode, the camera stays on the white player's side.
  if (gameMode === "two") {
    focusCameraOnTurn(currentPlayer);
  }
}



// ============================
// ПЕРЕВІРКА ПЕРЕМОЖЦЯ
// ============================

function checkWinner() {
  const whitePieces = pieces.filter((piece) => piece.color === "white");

  const blackPieces = pieces.filter((piece) => piece.color === "black");

  // ============================
  // НЕМАЄ БІЛИХ
  // ============================

  if (whitePieces.length === 0) {
    gameStarted = false;

    stopTimer();

    alert("🏆 Black wins!");

    return;
  }

  // ============================
  // НЕМАЄ ЧОРНИХ
  // ============================

  if (blackPieces.length === 0) {
    gameStarted = false;

    stopTimer();

    alert("🏆 White wins!");

    return;
  }

  // ============================
  // ПЕРЕВІРКА ХОДІВ
  // ============================

  const canMove = pieces.some((piece) => {
    if (piece.color !== currentPlayer) {
      return false;
    }

    if (getCaptures(piece).length > 0) {
      return true;
    }

    if (hasAnyCapture(currentPlayer)) {
      return false;
    }

    return hasNormalMove(piece);
  });

  // ============================
  // НЕМАЄ ХОДІВ
  // ============================

  if (!canMove) {
    gameStarted = false;

    stopTimer();

    const winner = currentPlayer === "white" ? "Black" : "White";

    alert(`🏆 ${winner} wins!`);
  }
}





// ============================
// ЗАПУСК
// ============================

menu.style.display = "block";
game.style.display = "none";
