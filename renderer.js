const SIZE = 8;

let pieces = [];
let selectedPiece = null;
let currentPlayer = "white";

let gameMode = null;
let gameStarted = false;

let timer = 30;
let timerInterval = null;

let aiCapturing = false;

let aiDifficulty = "easy";

// Online mode state; this client is part of the separate online project.
let onlineSocket = null;
let onlineRoomCode = null;
let onlineColor = null;
let applyingRemoteState = false;


// ============================
// DOM
// ============================

const board = document.getElementById("board");
const boardGrid = document.getElementById("boardGrid");
const board3d = document.getElementById("board3d");
const turnText = document.getElementById("turn");

const menu = document.getElementById("menu");
const game = document.getElementById("game");

const aiBtn = document.getElementById("aiBtn");
const twoPlayersBtn = document.getElementById("twoPlayersBtn");

const newGameBtn = document.getElementById("newGameBtn");
const menuBtn = document.getElementById("menuBtn");
const onlineBtn = document.getElementById("onlineBtn");
const onlinePanel = document.getElementById("onlinePanel");
const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const roomCodeInput = document.getElementById("roomCodeInput");
const onlineStatus = document.getElementById("onlineStatus");
const onlineBackBtn = document.getElementById("onlineBackBtn");


// ============================
// ONLINE CONNECTION / LOBBY
// ============================
function setOnlineStatus(message) {
  if (onlineStatus) onlineStatus.textContent = message;
}

function connectOnlineSocket() {
  if (onlineSocket) return;
  if (typeof io !== "function") {
    setOnlineStatus("Не вдалося завантажити Socket.IO. Перевір інтернет-з'єднання.");
    return;
  }
  const serverUrl = window.CHECKERS_SERVER_URL || "http://localhost:3000";
  onlineSocket = io(serverUrl, { timeout: 8000, reconnection: true });
  onlineSocket.on("connect", () => setOnlineStatus("З'єднано із сервером. Створи кімнату або введи код."));
  onlineSocket.on("connect_error", () => setOnlineStatus("Не вдалося підключитися до сервера: " + serverUrl));
  onlineSocket.on("room-created", ({ roomCode }) => {
    onlineRoomCode = roomCode;
    roomCodeInput.value = roomCode;
    setOnlineStatus("Кімнату створено! Код для друга: " + roomCode + ". Очікуємо другого гравця...");
  });
  onlineSocket.on("room-joined", ({ roomCode }) => {
    onlineRoomCode = roomCode;
    setOnlineStatus("Приєднано до кімнати " + roomCode + ". Очікуємо старту...");
  });
  onlineSocket.on("room-error", (message) => setOnlineStatus(message));
  onlineSocket.on("game-start", ({ roomCode, color, state }) => {
    onlineRoomCode = roomCode;
    onlineColor = color;
    onlinePanel.style.display = "none";
    menu.style.display = "none";
    startGame("online");
    applyOnlineState(state, false);
    setOnlineStatus("Гра почалася. Ти граєш за " + (color === "white" ? "білих" : "чорних") + ". Код: " + roomCode);
  });
  onlineSocket.on("state-update", (state) => applyOnlineState(state, true));
  onlineSocket.on("opponent-left", () => {
    alert("Суперник від'єднався від кімнати.");
    stopTimer();
    gameStarted = false;
    game.style.display = "none";
    onlinePanel.style.display = "block";
    setOnlineStatus("Суперник від'єднався. Можеш створити нову кімнату.");
    onlineRoomCode = null;
    onlineColor = null;
  });
}

function serializeOnlineState() {
  return {
    pieces: pieces.map(piece => ({ row: piece.row, col: piece.col, color: piece.color, king: !!piece.king })),
    currentPlayer
  };
}

function applyOnlineState(state, fromOpponent) {
  if (!state || !Array.isArray(state.pieces)) return;
  applyingRemoteState = true;
  pieces = state.pieces.map(piece => ({ row: piece.row, col: piece.col, color: piece.color, king: !!piece.king }));
  currentPlayer = state.currentPlayer === "black" ? "black" : "white";
  selectedPiece = null;
  aiCapturing = false;
  gameStarted = true;
  updateTurn();
  renderPieces();
  if (fromOpponent) startTimer();
  applyingRemoteState = false;
}

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
  onlinePanel.style.display = "none";
  menu.style.display = "block";
});

createRoomBtn.addEventListener("click", () => {
  connectOnlineSocket();
  if (!onlineSocket || !onlineSocket.connected) {
    setOnlineStatus("Немає з'єднання із сервером. Перевір адресу сервера.");
    return;
  }
  setOnlineStatus("Створюємо кімнату...");
  onlineSocket.emit("create-room");
});

joinRoomBtn.addEventListener("click", () => {
  connectOnlineSocket();
  const code = roomCodeInput.value.trim().toUpperCase();
  if (code.length !== 6) {
    setOnlineStatus("Введи 6-значний код кімнати.");
    return;
  }
  if (!onlineSocket || !onlineSocket.connected) {
    setOnlineStatus("Немає з'єднання із сервером. Перевір адресу сервера.");
    return;
  }
  setOnlineStatus("Приєднуємося до кімнати...");
  onlineSocket.emit("join-room", code);
});

newGameBtn.addEventListener("click", () => {
  if (gameMode === "online") {
    alert("Щоб почати нову онлайн-гру, повернися в меню та створи нову кімнату.");
    return;
  }
  startGame(gameMode);
});

menuBtn.addEventListener("click", () => {

  stopTimer();

  if (gameMode === "online" && onlineSocket && onlineRoomCode) {
    onlineSocket.emit("leave-room", onlineRoomCode);
  }
  gameStarted = false;
  selectedPiece = null;
  aiCapturing = false;
  onlineColor = null;
  onlineRoomCode = null;

  game.style.display = "none";
  menu.style.display = "block";
});

// ============================
// МЕНЮ СКЛАДНОСТІ
// ============================
function showDifficultyMenu() {

  menu.innerHTML = `
    <div class="difficulty-menu">

      <h2>Оберіть складність</h2>

      <button id="easyBtn">
        🟢 Легко
      </button>

      <button id="mediumBtn">
        🟡 Середньо
      </button>

      <button id="hardBtn">
        🔴 Важко
      </button>

      <button id="backBtn">
        ← Назад
      </button>

    </div>
  `;


  document
    .getElementById("easyBtn")
    .addEventListener("click", () => {

      selectDifficulty("easy");

    });


  document
    .getElementById("mediumBtn")
    .addEventListener("click", () => {

      selectDifficulty("medium");

    });


  document
    .getElementById("hardBtn")
    .addEventListener("click", () => {

      selectDifficulty("hard");

    });


  document
    .getElementById("backBtn")
    .addEventListener("click", () => {

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
  gameStarted = true;

  menu.style.display = "none";
  game.style.display = "block";

  currentPlayer = "white";
  selectedPiece = null;
  aiCapturing = false;

  // Start each mode from the white side. Only two-player mode will auto-flip
  // the camera on subsequent turns; AI mode keeps the user's chosen view.
  focusCameraOnTurn("white", true);

  createPieces();
  renderPieces();

  updateTurn();

  startTimer();
}


// ============================
// СТВОРЕННЯ ФІШОК
// ============================

function createPieces() {

  pieces = [];

  // Чорні
  for (let row = 0; row < 3; row++) {

    for (let col = 0; col < SIZE; col++) {

      if ((row + col) % 2 === 1) {

        pieces.push({
          row: row,
          col: col,
          color: "black",
          king: false
        });

      }
    }
  }

  // Білі
  for (let row = SIZE - 3; row < SIZE; row++) {

    for (let col = 0; col < SIZE; col++) {

      if ((row + col) % 2 === 1) {

        pieces.push({
          row: row,
          col: col,
          color: "white",
          king: false
        });

      }
    }
  }
}


// ============================
// THREE.JS: 3D-ДОШКА ТА ФІШКИ
// ============================

let scene3D = null;
let camera3D = null;
let renderer3D = null;
let pieces3D = new Map();
let boardSquares3D = [];
let moveMarkers3D = [];
let selectedMarker3D = null;
let cameraAngle = Math.PI / 1;
let cameraDistance = 15;
let cameraPitch = 1;
let cameraFocusAnimation = null;
let cameraFocusTarget = null;
let dragStart = null;
let dragMoved = false;

function init3DScene() {
  if (scene3D) return;
  if (!window.THREE) {
    board3d.innerHTML = '<div class="three-error">Не вдалося завантажити Three.js. Перевір підключення до інтернету та перезапусти гру.</div>';
    return;
  }

  const THREE = window.THREE;
  scene3D = new THREE.Scene();
  scene3D.background = new THREE.Color('#171b24');
  scene3D.fog = new THREE.Fog('#171b24', 15, 28);

  camera3D = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  update3DCamera();

  renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer3D.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer3D.shadowMap.enabled = true;
  renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer3D.outputColorSpace = THREE.SRGBColorSpace;
  renderer3D.toneMapping = THREE.ACESFilmicToneMapping;
  renderer3D.toneMappingExposure = 1.15;
  board3d.appendChild(renderer3D.domElement);

  scene3D.add(new THREE.HemisphereLight(0xe5efff, 0x44301f, 2.0));
  const keyLight = new THREE.DirectionalLight(0xffe4bd, 3.4);
  keyLight.position.set(-4, 10, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -7;
  keyLight.shadow.camera.right = 7;
  keyLight.shadow.camera.top = 7;
  keyLight.shadow.camera.bottom = -7;
  scene3D.add(keyLight);
  const rimLight = new THREE.PointLight(0x7aa9ff, 30, 18);
  rimLight.position.set(5, 5, -4);
  scene3D.add(rimLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: '#171b24', roughness: 0.92 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.38;
  floor.receiveShadow = true;
  scene3D.add(floor);

  const woodBase = new THREE.Mesh(
    new THREE.BoxGeometry(8.35, 0.38, 8.35),
    new THREE.MeshStandardMaterial({ color: '#40271d', roughness: 0.3, metalness: 0.08 })
  );
  woodBase.position.y = -0.12;
  woodBase.castShadow = true;
  woodBase.receiveShadow = true;
  scene3D.add(woodBase);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(8.12, 0.08, 8.12),
    new THREE.MeshStandardMaterial({ color: '#b27b43', roughness: 0.28, metalness: 0.35 })
  );
  trim.position.y = 0.095;
  scene3D.add(trim);

  boardSquares3D = [];
  const lightMat = new THREE.MeshStandardMaterial({ color: '#e7d2aa', roughness: 0.72 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#70452f', roughness: 0.48 });
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const square = new THREE.Mesh(
        new THREE.BoxGeometry(0.99, 0.09, 0.99),
        (row + col) % 2 === 0 ? lightMat : darkMat
      );
      square.position.set(col - 3.5, 0.17, row - 3.5);
      square.userData.row = row;
      square.userData.col = col;
      square.receiveShadow = true;
      square.castShadow = true;
      scene3D.add(square);
      boardSquares3D.push(square);
    }
  }

  // Decorative brass corners make the board visibly thick and finished.
  const cornerMat = new THREE.MeshStandardMaterial({ color: '#d7a45b', metalness: 0.72, roughness: 0.25 });
  for (const [x, z] of [[-3.92,-3.92],[3.92,-3.92],[-3.92,3.92],[3.92,3.92]]) {
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), cornerMat);
    corner.position.set(x, 0.11, z);
    corner.castShadow = true;
    scene3D.add(corner);
  }

  resize3D();
  window.addEventListener('resize', resize3D);
  // Middle mouse drag rotates the camera in real time. Left click remains for game moves.
  board.addEventListener('pointerdown', (event) => {
    if (event.button !== 1) return; // 1 = middle mouse button
    event.preventDefault();
    if (cameraFocusAnimation) {
      cancelAnimationFrame(cameraFocusAnimation);
      cameraFocusAnimation = null;
    }
    cameraFocusTarget = null;
    dragStart = {
      x: event.clientX,
      y: event.clientY,
      angle: cameraAngle,
      pitch: cameraPitch,
      pointerId: event.pointerId
    };
    dragMoved = false;
    try { board.setPointerCapture(event.pointerId); } catch (_) {}
  });
  board.addEventListener('pointermove', (event) => {
    if (!dragStart || dragStart.pointerId !== event.pointerId || !(event.buttons & 4)) return; // 4 = middle button held
    if (Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 4) dragMoved = true;
    cameraAngle = dragStart.angle + (event.clientX - dragStart.x) * 0.008;
    cameraPitch = Math.max(0.35, Math.min(1.25, dragStart.pitch + (event.clientY - dragStart.y) * 0.004));
    update3DCamera(); // update3DCamera now renders immediately, without restarting the game
  });
  window.addEventListener('pointerup', (event) => {
    if (!dragStart || event.pointerId === dragStart.pointerId) dragStart = null;
  });
  board.addEventListener('auxclick', (event) => {
    if (event.button === 1) event.preventDefault();
  });
  renderer3D.domElement.addEventListener('click', (event) => {
    if (dragMoved || !gameStarted) { dragMoved = false; return; }
    const rect = renderer3D.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera3D);
    const hit = raycaster.intersectObjects(boardSquares3D, false)[0];
    if (hit && hit.object.userData.row !== undefined) {
      handleCellClick(hit.object.userData.row, hit.object.userData.col);
    }
    dragMoved = false;
  });
  board.addEventListener('wheel', (event) => {
    event.preventDefault();
    cameraDistance = Math.max(9.5, Math.min(16, cameraDistance + event.deltaY * 0.008));
    update3DCamera();
  }, { passive: false });
  render3D();
}

function focusCameraOnTurn(player, immediate = false) {
  if (!camera3D) return;

  // White sits at row 7 (positive Z); black sits at row 0 (negative Z).
  // Keep the camera slightly off-axis and above the board so the pieces remain visibly 3D.
  cameraFocusTarget = {
    angle: player === "white" ? 0.24 : Math.PI + 0.24,
    pitch: 0.76
  };

  if (cameraFocusAnimation) {
    cancelAnimationFrame(cameraFocusAnimation);
    cameraFocusAnimation = null;
  }

  if (immediate) {
    cameraAngle = cameraFocusTarget.angle;
    cameraPitch = cameraFocusTarget.pitch;
    update3DCamera();
    return;
  }

  const animateFocus = () => {
    if (!camera3D || !cameraFocusTarget) return;
    // Rotate along the shortest direction to avoid a full extra spin at the 0/2π boundary.
    const targetAngle = cameraFocusTarget.angle;
    const delta = Math.atan2(Math.sin(targetAngle - cameraAngle), Math.cos(targetAngle - cameraAngle));
    cameraAngle += delta * 0.14;
    cameraPitch += (cameraFocusTarget.pitch - cameraPitch) * 0.14;

    if (Math.abs(delta) < 0.002 && Math.abs(cameraFocusTarget.pitch - cameraPitch) < 0.002) {
      cameraAngle = targetAngle;
      cameraPitch = cameraFocusTarget.pitch;
      cameraFocusAnimation = null;
      update3DCamera();
      return;
    }

    update3DCamera();
    cameraFocusAnimation = requestAnimationFrame(animateFocus);
  };
  cameraFocusAnimation = requestAnimationFrame(animateFocus);
}

function update3DCamera() {
  if (!camera3D) return;
  camera3D.position.set(
    Math.sin(cameraAngle) * cameraDistance * Math.cos(cameraPitch),
    cameraDistance * Math.sin(cameraPitch),
    Math.cos(cameraAngle) * cameraDistance * Math.cos(cameraPitch)
  );
  camera3D.lookAt(0, 0.1, 0);
  // Render immediately after camera changes; do not wait for a move or new game.
  if (renderer3D && scene3D) renderer3D.render(scene3D, camera3D);
}

function resize3D() {
  if (!renderer3D || !camera3D) return;
  const width = board3d.clientWidth || 720;
  const height = board3d.clientHeight || 720;
  renderer3D.setSize(width, height, false);
  camera3D.aspect = width / height;
  camera3D.updateProjectionMatrix();
  render3D();
}

function makePiece3D(piece) {
  const THREE = window.THREE;
  const group = new THREE.Group();
  const isWhite = piece.color === 'white';
  const bodyMat = new THREE.MeshStandardMaterial({
    color: isWhite ? '#e9edf3' : '#151c29',
    metalness: isWhite ? 0.28 : 0.42,
    roughness: isWhite ? 0.24 : 0.2
  });
  const edgeMat = new THREE.MeshStandardMaterial({
    color: isWhite ? '#aeb9c8' : '#05080e', metalness: 0.58, roughness: 0.22
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.035, 12, 48), edgeMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.12;
  group.add(rim);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.38, 0.19, 48, 1), bodyMat);
  body.position.y = 0.12;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.35, 0.055, 48), bodyMat);
  top.position.y = 0.235;
  top.castShadow = true;
  group.add(top);
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.265, 0.012, 8, 48), edgeMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 0.266;
  group.add(topRing);

  if (piece.king) {
    const gold = new THREE.MeshStandardMaterial({ color: '#f4c45e', metalness: 0.78, roughness: 0.2, emissive: '#5b3505', emissiveIntensity: 0.15 });
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.055, 32), gold);
    crownBase.position.y = 0.31;
    group.add(crownBase);
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 8, 32), gold);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 0.35;
    group.add(crownRing);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const point = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), gold);
      point.position.set(Math.cos(a) * 0.17, 0.385, Math.sin(a) * 0.17);
      point.castShadow = true;
      group.add(point);
    }
  }
  group.userData.piece = piece;
  scene3D.add(group);
  return group;
}

function dispose3DObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    }
  });
}

function clearDynamic3D() {
  if (!scene3D) return;
  for (const group of pieces3D.values()) {
    scene3D.remove(group);
    dispose3DObject(group);
  }
  pieces3D.clear();
  for (const marker of moveMarkers3D) {
    scene3D.remove(marker);
    dispose3DObject(marker);
  }
  moveMarkers3D = [];
  if (selectedMarker3D) {
    scene3D.remove(selectedMarker3D);
    dispose3DObject(selectedMarker3D);
  }
  selectedMarker3D = null;
}

function render3D() {
  if (!scene3D || !renderer3D) return;
  clearDynamic3D();
  const THREE = window.THREE;
  pieces.forEach((piece) => {
    const group = makePiece3D(piece);
    group.position.set(piece.col - 3.5, 0.22, piece.row - 3.5);
    pieces3D.set(piece, group);
    if (piece === selectedPiece) {
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.43, 0.035, 10, 48),
        new THREE.MeshBasicMaterial({ color: '#55f28b' })
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.set(piece.col - 3.5, 0.25, piece.row - 3.5);
      scene3D.add(halo);
      selectedMarker3D = halo;
    }
  });
  boardGrid.querySelectorAll('.cell.possible').forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const marker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.025, 32),
      new THREE.MeshStandardMaterial({ color: '#40e879', emissive: '#087a32', emissiveIntensity: 0.7, transparent: true, opacity: 0.88 })
    );
    marker.position.set(col - 3.5, 0.24, row - 3.5);
    scene3D.add(marker);
    moveMarkers3D.push(marker);
  });
  renderer3D.render(scene3D, camera3D);
}

function createBoard() {
  init3DScene();
  boardGrid.innerHTML = '';
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
      cell.dataset.row = row;
      cell.dataset.col = col;
      boardGrid.appendChild(cell);
    }
  }
}

function renderPieces() {
  createBoard();
  if (scene3D) render3D();
}


// ============================
// ОТРИМАТИ КЛІТИНКУ
// ============================

function getCell(row, col) {

  return boardGrid.querySelector(
    `.cell[data-row="${row}"][data-col="${col}"]`
  );
}


// ============================
// КЛІК ПО КЛІТИНЦІ
// ============================

function handleCellClick(row, col) {

  if (gameMode === "online" && onlineColor !== currentPlayer) {
    return;
  }

  // Людина не може керувати чорними
  // під час гри проти AI
  if (
    gameMode === "ai" &&
    currentPlayer === "black"
  ) {
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

  if (
    piece &&
    piece.color === currentPlayer
  ) {

    // Якщо є обов'язкове взяття
    if (hasAnyCapture(currentPlayer)) {

      const captures =
        getCaptures(piece);

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

  const captures =
    getCaptures(piece);

  // Якщо є взяття
  if (captures.length > 0) {

    captures.forEach(move => {
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
      [1, 1]
    ];

    directions.forEach(([dr, dc]) => {

      let row = piece.row + dr;
      let col = piece.col + dc;

      while (isInside(row, col)) {

        if (getPiece(row, col)) {
          break;
        }

        const cell =
          getCell(row, col);

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

  const direction =
    piece.color === "white"
      ? -1
      : 1;

  const moves = [
    [direction, -1],
    [direction, 1]
  ];

  moves.forEach(([dr, dc]) => {

    const row =
      piece.row + dr;

    const col =
      piece.col + dc;

    if (
      isInside(row, col) &&
      !getPiece(row, col)
    ) {

      const cell =
        getCell(row, col);

      if (cell) {
        cell.classList.add("possible");
      }
    }
  });
  render3D();
}


// ============================
// ПЕРЕВІРКА ХОДУ
// ============================

function isPossibleMove(row, col) {

  if (!selectedPiece) {
    return false;
  }

  if (!isInside(row, col)) {
    return false;
  }

  if (getPiece(row, col)) {
    return false;
  }


  // ============================
  // ВЗЯТТЯ
  // ============================

  const captures =
    getCaptures(selectedPiece);

  const capture =
    captures.find(move =>
      move.row === row &&
      move.col === col
    );

  if (capture) {
    return true;
  }


  // Якщо є обов'язкове взяття
  if (hasAnyCapture(currentPlayer)) {
    return false;
  }


  // ============================
  // ДАМКА
  // ============================

  if (selectedPiece.king) {

    const rowDiff =
      Math.abs(
        row - selectedPiece.row
      );

    const colDiff =
      Math.abs(
        col - selectedPiece.col
      );

    if (rowDiff !== colDiff) {
      return false;
    }

    const rowDirection =
      row > selectedPiece.row
        ? 1
        : -1;

    const colDirection =
      col > selectedPiece.col
        ? 1
        : -1;

    let checkRow =
      selectedPiece.row +
      rowDirection;

    let checkCol =
      selectedPiece.col +
      colDirection;

    while (
      checkRow !== row &&
      checkCol !== col
    ) {

      if (getPiece(checkRow, checkCol)) {
        return false;
      }

      checkRow += rowDirection;
      checkCol += colDirection;
    }

    return true;
  }


  // ============================
  // ЗВИЧАЙНА ШАШКА
  // ============================

  const direction =
    selectedPiece.color === "white"
      ? -1
      : 1;

  const rowDiff =
    row - selectedPiece.row;

  const colDiff =
    Math.abs(
      col - selectedPiece.col
    );

  return (
    rowDiff === direction &&
    colDiff === 1
  );
}


// ============================
// ХІД
// ============================

function movePiece(row, col) {

  const captures =
    getCaptures(selectedPiece);

  const capture =
    captures.find(move =>
      move.row === row &&
      move.col === col
    );


  // ============================
  // ВИДАЛЯЄМО ВЗЯТУ ШАШКУ
  // ============================

  if (capture) {

    pieces =
      pieces.filter(piece =>
        piece !== capture.enemy
      );
  }


  // ============================
  // ПЕРЕМІЩЕННЯ
  // ============================

  selectedPiece.row = row;
  selectedPiece.col = col;


  // ============================
  // ПЕРЕТВОРЕННЯ НА ДАМКУ
  // ============================

  if (
    selectedPiece.color === "white" &&
    selectedPiece.row === 0
  ) {

    selectedPiece.king = true;
  }

  if (
    selectedPiece.color === "black" &&
    selectedPiece.row === SIZE - 1
  ) {

    selectedPiece.king = true;
  }


  // ============================
  // НАСТУПНЕ ВЗЯТТЯ
  // ============================

  if (capture) {

    const nextCaptures =
      getCaptures(selectedPiece);

    if (nextCaptures.length > 0) {

      // ============================
      // AI ПРОДОВЖУЄ ВЗЯТТЯ
      // ============================

      if (
        gameMode === "ai" &&
        currentPlayer === "black"
      ) {

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

      showPossibleMoves(
        selectedPiece
      );

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

  if (gameMode === "online" && onlineSocket && onlineRoomCode && !applyingRemoteState) {
    onlineSocket.emit("game-state", {
      roomCode: onlineRoomCode,
      state: serializeOnlineState()
    });
  }


  // ============================
  // ХІД AI
  // ============================

  if (
    gameMode === "ai" &&
    currentPlayer === "black" &&
    gameStarted
  ) {

    setTimeout(() => {
      aiMove();
    }, 500);
  }
}


// ============================
// ОТРИМАТИ ВЗЯТТЯ
// ============================

function getCaptures(piece) {

  const captures = [];


  // ============================
  // ДАМКА
  // ============================

  if (piece.king) {

    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];

    directions.forEach(([dr, dc]) => {

      let row = piece.row + dr;
      let col = piece.col + dc;

      let enemy = null;

      while (isInside(row, col)) {

        const target =
          getPiece(row, col);


        // Порожня клітинка
        if (!target) {

          if (enemy) {

            captures.push({
              row: row,
              col: col,
              enemy: enemy
            });
          }

          row += dr;
          col += dc;

          continue;
        }


        // Власна шашка
        if (
          target.color === piece.color
        ) {
          break;
        }


        // Другий ворог
        if (enemy) {
          break;
        }


        // Перший ворог
        enemy = target;

        row += dr;
        col += dc;
      }
    });

    return captures;
  }


  // ============================
  // ЗВИЧАЙНА ШАШКА
  // ============================

  const directions = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1]
  ];

  directions.forEach(([dr, dc]) => {

    const enemyRow =
      piece.row + dr;

    const enemyCol =
      piece.col + dc;

    const landingRow =
      piece.row + dr * 2;

    const landingCol =
      piece.col + dc * 2;


    if (
      !isInside(enemyRow, enemyCol) ||
      !isInside(landingRow, landingCol)
    ) {
      return;
    }


    const enemy =
      getPiece(
        enemyRow,
        enemyCol
      );

    const landing =
      getPiece(
        landingRow,
        landingCol
      );


    if (
      enemy &&
      enemy.color !== piece.color &&
      !landing
    ) {

      captures.push({
        row: landingRow,
        col: landingCol,
        enemy: enemy
      });
    }
  });

  return captures;
}


// ============================
// ЧИ Є ВЗЯТТЯ
// ============================

function hasAnyCapture(color) {

  return pieces.some(piece => {

    if (piece.color !== color) {
      return false;
    }

    return (
      getCaptures(piece).length > 0
    );
  });
}


// ============================
// ЗМІНА ХОДУ
// ============================

function changeTurn() {

  currentPlayer =
    currentPlayer === "white"
      ? "black"
      : "white";

  updateTurn();
}


// ============================
// ОНОВИТИ ТЕКСТ ХОДУ
// ============================

function updateTurn() {

  turnText.textContent =
    currentPlayer === "white"
      ? "Білі"
      : "Чорні";

  // Auto-switch the camera only in local two-player mode.
  // Against AI, keep the current view unchanged when the turn changes.
  if (gameMode === "two") {
    focusCameraOnTurn(currentPlayer);
  }
}


// ============================
// ТАЙМЕР
// ============================

function startTimer() {

  stopTimer();

  timer = 30;

  updateTimer();

  timerInterval =
    setInterval(() => {

      timer--;

      updateTimer();

      if (timer <= 0) {

        stopTimer();

        timeOut();
      }

    }, 1000);
}


// ============================
// ЗУПИНИТИ ТАЙМЕР
// ============================

function stopTimer() {

  if (timerInterval) {

    clearInterval(
      timerInterval
    );

    timerInterval = null;
  }
}


// ============================
// ОНОВИТИ ТАЙМЕР
// ============================

function updateTimer() {

  const whiteTime =
    document.getElementById(
      "whiteTime"
    );

  const blackTime =
    document.getElementById(
      "blackTime"
    );

  const progress =
    document.getElementById(
      "timerProgress"
    );


  if (
    !whiteTime ||
    !blackTime ||
    !progress
  ) {
    return;
  }


  if (currentPlayer === "white") {

    whiteTime.textContent = timer;
    blackTime.textContent = "30";

  } else {

    blackTime.textContent = timer;
    whiteTime.textContent = "30";
  }


  progress.style.width =
    `${(timer / 30) * 100}%`;
}


// ============================
// ЧАС ВИЙШОВ
// ============================

function timeOut() {

  gameStarted = false;

  aiCapturing = false;
  selectedPiece = null;

  const winner =
    currentPlayer === "white"
      ? "Чорні"
      : "Білі";

  alert(
    `⏰ Час вийшов!\n\nПеремогли: ${winner}!`
  );
}


// ============================
// ПЕРЕВІРКА ПЕРЕМОЖЦЯ
// ============================

function checkWinner() {

  const whitePieces =
    pieces.filter(piece =>
      piece.color === "white"
    );

  const blackPieces =
    pieces.filter(piece =>
      piece.color === "black"
    );


  // ============================
  // НЕМАЄ БІЛИХ
  // ============================

  if (whitePieces.length === 0) {

    gameStarted = false;

    stopTimer();

    alert("🏆 Чорні перемогли!");

    return;
  }


  // ============================
  // НЕМАЄ ЧОРНИХ
  // ============================

  if (blackPieces.length === 0) {

    gameStarted = false;

    stopTimer();

    alert("🏆 Білі перемогли!");

    return;
  }


  // ============================
  // ПЕРЕВІРКА ХОДІВ
  // ============================

  const canMove =
    pieces.some(piece => {

      if (
        piece.color !== currentPlayer
      ) {
        return false;
      }


      if (
        getCaptures(piece).length > 0
      ) {
        return true;
      }


      if (
        hasAnyCapture(currentPlayer)
      ) {
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

    const winner =
      currentPlayer === "white"
        ? "Чорні"
        : "Білі";

    alert(
      `🏆 ${winner} перемогли!`
    );
  }
}


// ============================
// ЧИ Є ЗВИЧАЙНИЙ ХІД
// ============================

function hasNormalMove(piece) {

  // ============================
  // ДАМКА
  // ============================

  if (piece.king) {

    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];

    for (
      const [dr, dc]
      of directions
    ) {

      const row =
        piece.row + dr;

      const col =
        piece.col + dc;


      if (
        isInside(row, col) &&
        !getPiece(row, col)
      ) {

        return true;
      }
    }

    return false;
  }


  // ============================
  // ЗВИЧАЙНА ШАШКА
  // ============================

  const direction =
    piece.color === "white"
      ? -1
      : 1;

  const moves = [
    [direction, -1],
    [direction, 1]
  ];


  return moves.some(([dr, dc]) => {

    const row =
      piece.row + dr;

    const col =
      piece.col + dc;


    return (
      isInside(row, col) &&
      !getPiece(row, col)
    );
  });
}


// ============================
// AI
// ============================

function aiMove() {

  if (!gameStarted) {
    return;
  }

  if (currentPlayer !== "black") {
    return;
  }

  let possibleMoves = [];

  // ============================
// EASY
// ============================

function getEasyMove(moves) {

  return moves[
    Math.floor(
      Math.random() * moves.length
    )
  ];
}


// ============================
// MEDIUM
// ============================

function getMediumMove(moves) {

  let bestMoves = [];
  let bestScore = -Infinity;


  moves.forEach(option => {

    let score = 0;

    const piece = option.piece;
    const move = option.move;


    // Взяття — хороший хід
    if (option.capture) {
      score += 10;
    }


    // Стати дамкою — дуже хороший хід
    if (
      !piece.king &&
      move.row === SIZE - 1
    ) {

      score += 8;
    }


    // Просування вперед
    score += move.row;


    if (score > bestScore) {

      bestScore = score;
      bestMoves = [option];

    } else if (score === bestScore) {

      bestMoves.push(option);
    }

  });


  return bestMoves[
    Math.floor(
      Math.random() * bestMoves.length
    )
  ];
}



// ============================
// HARD AI
// ============================

function getHardMove(moves) {

  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {

    const newPieces = simulateMove(
      pieces,
      move
    );

    const score = minimax(
      newPieces,
      7,
      false
    );

    if (score > bestScore) {

      bestScore = score;
      bestMove = move;

    }
  }

  return bestMove;
}

// ============================
// MINIMAX
// ============================

function minimax(boardState, depth, maximizingPlayer) {

  if (depth === 0) {
    return evaluateBoard(boardState);
  }


  // ----------------------------
  // Хід AI
  // ----------------------------

  if (maximizingPlayer) {

    const moves =
      getAllMoves(boardState, "black");

    if (moves.length === 0) {
      return -10000;
    }

    let bestScore = -Infinity;

    for (const move of moves) {

      const newBoard =
        simulateMove(boardState, move);

      const score =
        minimax(
          newBoard,
          depth - 1,
          false
        );

      bestScore =
        Math.max(bestScore, score);
    }

    return bestScore;
  }


  // ----------------------------
  // Хід гравця
  // ----------------------------

  const moves =
    getAllMoves(boardState, "white");

  if (moves.length === 0) {
    return 10000;
  }

  let bestScore = Infinity;

  for (const move of moves) {

    const newBoard =
      simulateMove(boardState, move);

    const score =
      minimax(
        newBoard,
        depth - 1,
        true
      );

    bestScore =
      Math.min(bestScore, score);
  }

  return bestScore;
}


// ============================
// ОЦІНКА ДОШКИ
// ============================

function evaluateBoard(boardState) {

  let score = 0;

  boardState.forEach(piece => {

    // Звичайна шашка
    if (!piece.king) {

      if (piece.color === "black") {
        score += 100;
      } else {
        score -= 100;
      }

    }

    // Дамка набагато цінніша
    else {

      if (piece.color === "black") {
        score += 175;
      } else {
        score -= 175;
      }

    }


    // ----------------------------
    // Позиція
    // ----------------------------

    if (piece.color === "black") {

      score += piece.row * 3;

    } else {

      score -= (SIZE - 1 - piece.row) * 3;

    }


    // ----------------------------
    // Центр дошки
    // ----------------------------

    if (
      piece.col >= 2 &&
      piece.col <= 5 &&
      piece.row >= 2 &&
      piece.row <= 5
    ) {

      if (piece.color === "black") {
        score += 5;
      } else {
        score -= 5;
      }
    }

  });

  return score;
}


// ============================
// ОТРИМАТИ ВСІ ХОДИ
// ============================

function getAllMoves(boardState, color) {

  const moves = [];

  const mustCapture =
    hasCaptureInBoard(
      boardState,
      color
    );


  boardState.forEach(piece => {

    if (piece.color !== color) {
      return;
    }


    // ----------------------------
    // Якщо треба бити
    // ----------------------------

    if (mustCapture) {

      const captures =
        getCapturesFromBoard(
          boardState,
          piece
        );

      captures.forEach(capture => {

        moves.push({
          piece: piece,
          move: capture,
          capture: true
        });

      });

      return;
    }


    // ----------------------------
    // Дамка
    // ----------------------------

    if (piece.king) {

      const directions = [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ];


      directions.forEach(([dr, dc]) => {

        let row =
          piece.row + dr;

        let col =
          piece.col + dc;


        while (
          isInside(row, col)
        ) {

          if (
            getPieceFromBoard(
              boardState,
              row,
              col
            )
          ) {
            break;
          }


          moves.push({
            piece: piece,
            move: {
              row: row,
              col: col
            },
            capture: false
          });


          row += dr;
          col += dc;
        }

      });

      return;
    }


    // ----------------------------
    // Звичайна шашка
    // ----------------------------

    const direction =
      color === "black"
        ? 1
        : -1;


    const directions = [
      [direction, -1],
      [direction, 1]
    ];


    directions.forEach(([dr, dc]) => {

      const row =
        piece.row + dr;

      const col =
        piece.col + dc;


      if (
        isInside(row, col) &&
        !getPieceFromBoard(
          boardState,
          row,
          col
        )
      ) {

        moves.push({
          piece: piece,
          move: {
            row: row,
            col: col
          },
          capture: false
        });

      }

    });

  });


  return moves;
}


// ============================
// ПЕРЕВІРКА ВЗЯТТЯ
// ============================

function hasCaptureInBoard(
  boardState,
  color
) {

  return boardState.some(piece => {

    if (piece.color !== color) {
      return false;
    }

    return (
      getCapturesFromBoard(
        boardState,
        piece
      ).length > 0
    );

  });
}


// ============================
// ВЗЯТТЯ НА КОПІЇ ДОШКИ
// ============================

function getCapturesFromBoard(
  boardState,
  piece
) {

  const captures = [];


  // ----------------------------
  // ДАМКА
  // ----------------------------

  if (piece.king) {

    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];


    directions.forEach(([dr, dc]) => {

      let row =
        piece.row + dr;

      let col =
        piece.col + dc;

      let enemy = null;


      while (
        isInside(row, col)
      ) {

        const target =
          getPieceFromBoard(
            boardState,
            row,
            col
          );


        // Порожня клітинка
        if (!target) {

          if (enemy) {

            captures.push({
              row: row,
              col: col,
              enemy: enemy
            });

          }

          row += dr;
          col += dc;

          continue;
        }


        // Своя шашка
        if (
          target.color === piece.color
        ) {
          break;
        }


        // Другий ворог
        if (enemy) {
          break;
        }


        enemy = target;

        row += dr;
        col += dc;
      }

    });


    return captures;
  }


  // ----------------------------
  // ЗВИЧАЙНА ШАШКА
  // ----------------------------

  const directions = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1]
  ];


  directions.forEach(([dr, dc]) => {

    const enemyRow =
      piece.row + dr;

    const enemyCol =
      piece.col + dc;

    const landingRow =
      piece.row + dr * 2;

    const landingCol =
      piece.col + dc * 2;


    if (
      !isInside(
        enemyRow,
        enemyCol
      ) ||
      !isInside(
        landingRow,
        landingCol
      )
    ) {
      return;
    }


    const enemy =
      getPieceFromBoard(
        boardState,
        enemyRow,
        enemyCol
      );


    const landing =
      getPieceFromBoard(
        boardState,
        landingRow,
        landingCol
      );


    if (
      enemy &&
      enemy.color !== piece.color &&
      !landing
    ) {

      captures.push({
        row: landingRow,
        col: landingCol,
        enemy: enemy
      });

    }

  });


  return captures;
}


// ============================
// ОТРИМАТИ ШАШКУ З КОПІЇ
// ============================

function getPieceFromBoard(
  boardState,
  row,
  col
) {

  return boardState.find(piece =>
    piece.row === row &&
    piece.col === col
  );
}


// ============================
// СИМУЛЯЦІЯ ХОДУ
// ============================

function simulateMove(
  boardState,
  option
) {

  // Створюємо копію дошки
  const newBoard =
    boardState.map(piece => ({
      row: piece.row,
      col: piece.col,
      color: piece.color,
      king: piece.king
    }));


  // Знаходимо шашку
  const piece =
    newBoard.find(p =>
      p.row === option.piece.row &&
      p.col === option.piece.col &&
      p.color === option.piece.color
    );


  if (!piece) {
    return newBoard;
  }


  // ----------------------------
  // ВИДАЛЕННЯ ВОРОГА
  // ----------------------------

  if (
    option.capture &&
    option.move.enemy
  ) {

    const enemy =
      newBoard.find(p =>
        p.row === option.move.enemy.row &&
        p.col === option.move.enemy.col &&
        p.color === option.move.enemy.color
      );


    if (enemy) {

      const index =
        newBoard.indexOf(enemy);

      newBoard.splice(index, 1);
    }
  }


  // ----------------------------
  // РУХ
  // ----------------------------

  piece.row =
    option.move.row;

  piece.col =
    option.move.col;


  // ----------------------------
  // ДАМКА
  // ----------------------------

  if (
    piece.color === "black" &&
    piece.row === SIZE - 1
  ) {

    piece.king = true;

  }


  if (
    piece.color === "white" &&
    piece.row === 0
  ) {

    piece.king = true;

  }


  return newBoard;
}


  // ============================
  // ПРОДОВЖЕННЯ ВЗЯТТЯ
  // ============================

  if (
    aiCapturing &&
    selectedPiece
  ) {

    const captures =
      getCaptures(selectedPiece);

    captures.forEach(move => {

      possibleMoves.push({
        piece: selectedPiece,
        move: move,
        capture: true
      });
    });
  }


  // ============================
  // НОВИЙ ХІД AI
  // ============================

  if (
    !aiCapturing &&
    !selectedPiece
  ) {

    const mustCapture =
      hasAnyCapture("black");


    // ============================
    // ОБОВ'ЯЗКОВЕ ВЗЯТТЯ
    // ============================

    if (mustCapture) {

      pieces.forEach(piece => {

        if (
          piece.color !== "black"
        ) {
          return;
        }


        const captures =
          getCaptures(piece);


        captures.forEach(move => {

          possibleMoves.push({
            piece: piece,
            move: move,
            capture: true
          });
        });
      });


    } else {

      // ============================
      // ЗВИЧАЙНІ ХОДИ
      // ============================

      pieces.forEach(piece => {

        if (
          piece.color !== "black"
        ) {
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
            [1, 1]
          ];


          directions.forEach(
            ([dr, dc]) => {

              let row =
                piece.row + dr;

              let col =
                piece.col + dc;


              while (
                isInside(row, col)
              ) {

                if (getPiece(row, col)) {
                  break;
                }


                possibleMoves.push({
                  piece: piece,
                  move: {
                    row: row,
                    col: col
                  },
                  capture: false
                });


                row += dr;
                col += dc;
              }
            }
          );


        } else {

          // ============================
          // ЗВИЧАЙНА ШАШКА
          // ============================

          const direction = 1;

          const moves = [
            [direction, -1],
            [direction, 1]
          ];


          moves.forEach(
            ([dr, dc]) => {

              const row =
                piece.row + dr;

              const col =
                piece.col + dc;


              if (
                isInside(row, col) &&
                !getPiece(row, col)
              ) {

                possibleMoves.push({
                  piece: piece,
                  move: {
                    row: row,
                    col: col
                  },
                  capture: false
                });
              }
            }
          );
        }
      });
    }
  }


  // ============================
  // НЕМАЄ ХОДІВ
  // ============================

  if (
    possibleMoves.length === 0
  ) {

    // AI закінчив серію взяттів
    if (aiCapturing) {

      aiCapturing = false;
      selectedPiece = null;

      changeTurn();

      startTimer();

      renderPieces();

      checkWinner();

      return;
    }


    checkWinner();

    return;
  }


  // ============================
  // ВИБИРАЄМО ВИПАДКОВИЙ ХІД
  // ============================

  let choice;

  if (aiDifficulty === "easy") {

    choice = getEasyMove(possibleMoves);

  } else if (aiDifficulty === "medium") {

    choice = getMediumMove(possibleMoves);

  } else if (aiDifficulty === "hard") {

    choice = getHardMove(possibleMoves);
  }


  selectedPiece =
    choice.piece;


  movePiece(
    choice.move.row,
    choice.move.col
  );
}


// ============================
// ОТРИМАТИ ШАШКУ
// ============================

function getPiece(row, col) {

  return pieces.find(piece =>
    piece.row === row &&
    piece.col === col
  );
}


// ============================
// ПЕРЕВІРКА КООРДИНАТ
// ============================

function isInside(row, col) {

  return (
    row >= 0 &&
    row < SIZE &&
    col >= 0 &&
    col < SIZE
  );
}


// ============================
// ЗАПУСК
// ============================

menu.style.display = "block";
game.style.display = "none";
