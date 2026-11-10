// ============================
// ТАЙМЕР
// ============================

function startTimer() {
  stopTimer();

  timer = TURN_TIME;

  updateTimer();

  timerInterval = setInterval(() => {
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
    clearInterval(timerInterval);

    timerInterval = null;
  }
}

// ============================
// ОНОВИТИ ТАЙМЕР
// ============================

function updateTimer() {
  const whiteTime = document.getElementById("whiteTime");
  const blackTime = document.getElementById("blackTime");
  const progress = document.getElementById("timerProgress");

  if (!whiteTime || !blackTime || !progress) {
    return;
  }

  if (currentPlayer === "white") {
    whiteTime.textContent = timer;
    blackTime.textContent = TURN_TIME;
  } else {
    blackTime.textContent = timer;
    whiteTime.textContent = TURN_TIME;
  }

  progress.style.width = `${(timer / TURN_TIME) * 100}%`;
}

// ============================
// ЧАС ВИЙШОВ
// ============================

function timeOut() {
  gameStarted = false;

  aiCapturing = false;
  selectedPiece = null;

  const winner = currentPlayer === "white" ? "Black" : "White";

  alert(`⏰ Time is up!\n\n${winner} wins!`);
}
