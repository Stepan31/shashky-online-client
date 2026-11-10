// ============================
// ONLINE CONNECTION / LOBBY
// ============================
function setOnlineStatus(message) {
  if (onlineStatus) onlineStatus.textContent = message;
}

function connectOnlineSocket() {
  if (onlineSocket) return;

  if (typeof io !== "function") {
    setOnlineStatus(
      "Failed to load Socket.IO. Check your internet connection.",
    );
    return;
  }

  const serverUrl = window.CHECKERS_SERVER_URL || "http://localhost:3000";

  let connectionTimer = null;
  let connectionStartedAt = null;

  function startConnectionTimer() {
    if (connectionTimer) return;

    connectionStartedAt = Date.now();
    setOnlineStatus("Connecting to server... 0s");

    connectionTimer = setInterval(() => {
      const elapsedSeconds = Math.floor(
        (Date.now() - connectionStartedAt) / 1000,
      );

      setOnlineStatus("Connecting to server... " + elapsedSeconds + "s");
    }, 1000);
  }

  function stopConnectionTimer() {
    if (connectionTimer) {
      clearInterval(connectionTimer);
      connectionTimer = null;
    }
  }

  startConnectionTimer();

  onlineSocket = io(serverUrl, {
    timeout: 8000,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  function renderOnlineRooms() {
    const roomsList = document.getElementById("roomsList");
    if (!roomsList) return;

    roomsList.innerHTML = "";

    onlineRooms.forEach((room) => {
      const roomElement = document.createElement("div");
      roomElement.className = "room-join";

      const info = document.createElement("span");
      info.textContent =
        "Room " +
        room.roomId +
        " — " +
        room.playerCount +
        "/" +
        room.maxPlayers +
        " players";

      const button = document.createElement("button");
      button.type = "button";

      const isFull = room.playerCount >= room.maxPlayers;
      const isActive = room.status === "starting" || room.status === "playing";
      const isMyRoom = onlineRoomCode === room.roomId;

      if (isMyRoom) {
        button.textContent = "Your Room";
        button.disabled = true;
      } else if (isFull || isActive) {
        button.textContent = "Unavailable";
        button.disabled = true;
      } else {
        button.textContent = "Join";
        button.addEventListener("click", () => {
          onlineSocket.emit("join-fixed-room", room.roomId);
          setOnlineStatus("Joining Room " + room.roomId + "...");
        });
      }

      roomElement.appendChild(info);
      roomElement.appendChild(button);
      roomsList.appendChild(roomElement);
    });
  }

  onlineSocket.on("connect", () => {
    stopConnectionTimer();

    setOnlineStatus("Connected to server. Select a room.");
    onlineSocket.emit("get-rooms");
  });

  onlineSocket.on("disconnect", () => {
    startConnectionTimer();
  });

  onlineSocket.on("connect_error", () => {
    // Socket.IO will automatically retry the connection.
    // Keep showing the connection timer.
  });

  onlineSocket.on("rooms-update", (rooms) => {
    onlineRooms = rooms;
    renderOnlineRooms();
  });

  onlineSocket.on("room-joined", ({ roomId, color }) => {
    onlineRoomCode = roomId;
    onlineColor = color;

    setOnlineStatus(
      "Joined Room " +
        roomId +
        ". Your color: " +
        (color === "white" ? "White" : "Black") +
        ".",
    );
  });

  onlineSocket.on("waiting-for-player", () => {
    setOnlineStatus("Waiting for another player...");
  });

  onlineSocket.on("countdown", ({ seconds }) => {
    setOnlineStatus("Game starts in " + seconds + "...");
  });

  onlineSocket.on("room-error", (message) => {
    setOnlineStatus(message);
  });

  onlineSocket.on("game-start", ({ roomId, color, state }) => {
    onlineRoomCode = roomId;
    onlineColor = color;

    onlinePanel.style.display = "none";
    menu.style.display = "none";

    startGame("online");
    applyOnlineState(state, false);

    setOnlineStatus(
      "Game started. You are playing as " +
        (color === "white" ? "White" : "Black") +
        ".",
    );
  });

  onlineSocket.on("state-update", (state) => {
    applyOnlineState(state, true);
  });

  onlineSocket.on("opponent-left", () => {
    stopTimer();

    gameStarted = false;
    game.style.display = "none";
    onlinePanel.style.display = "block";

    onlineRoomCode = null;
    onlineColor = null;

    setOnlineStatus("Opponent disconnected. You can select another room.");

    onlineSocket.emit("get-rooms");
  });
}

function serializeOnlineState() {
  return {
    pieces: pieces.map((piece) => ({
      row: piece.row,
      col: piece.col,
      color: piece.color,
      king: !!piece.king,
    })),
    currentPlayer,
    gameOver: !gameStarted,
  };
}
function applyOnlineState(state, fromOpponent) {
  if (!state || !Array.isArray(state.pieces)) return;
  // Звук лише тоді, коли дошка справді змінилася
  if (fromOpponent) {
    const boardChanged =
      state.pieces.length !== pieces.length ||
      state.pieces.some(
        (remotePiece) =>
          !pieces.some(
            (localPiece) =>
              localPiece.row === remotePiece.row &&
              localPiece.col === remotePiece.col &&
              localPiece.color === remotePiece.color &&
              !!localPiece.king === !!remotePiece.king,
          ),
      );

    if (boardChanged) {
      playMoveSound(state.pieces.length < pieces.length);
    }
  }
  applyingRemoteState = true;
  pieces = state.pieces.map((piece) => ({
    row: piece.row,
    col: piece.col,
    color: piece.color,
    king: !!piece.king,
  }));
  currentPlayer = state.currentPlayer === "black" ? "black" : "white";
  selectedPiece = null;
  aiCapturing = false;
  gameStarted = true;
  updateTurn();
  renderPieces();
  if (fromOpponent) startTimer();
  applyingRemoteState = false;
}
