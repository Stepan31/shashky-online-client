// ============================
// ОТРИМАТИ ШАШКУ
// ============================

function getPiece(row, col) {
  return pieces.find((piece) => piece.row === row && piece.col === col);
}

// ============================
// ПЕРЕВІРКА КООРДИНАТ
// ============================

function isInside(row, col) {
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE;
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
          king: false,
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
          king: false,
        });
      }
    }
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
      [1, 1],
    ];

    directions.forEach(([dr, dc]) => {
      let row = piece.row + dr;
      let col = piece.col + dc;

      let enemy = null;

      while (isInside(row, col)) {
        const target = getPiece(row, col);

        // Порожня клітинка
        if (!target) {
          if (enemy) {
            captures.push({
              row: row,
              col: col,
              enemy: enemy,
            });
          }

          row += dr;
          col += dc;

          continue;
        }

        // Власна шашка
        if (target.color === piece.color) {
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
    [1, 1],
  ];

  directions.forEach(([dr, dc]) => {
    const enemyRow = piece.row + dr;

    const enemyCol = piece.col + dc;

    const landingRow = piece.row + dr * 2;

    const landingCol = piece.col + dc * 2;

    if (!isInside(enemyRow, enemyCol) || !isInside(landingRow, landingCol)) {
      return;
    }

    const enemy = getPiece(enemyRow, enemyCol);

    const landing = getPiece(landingRow, landingCol);

    if (enemy && enemy.color !== piece.color && !landing) {
      captures.push({
        row: landingRow,
        col: landingCol,
        enemy: enemy,
      });
    }
  });

  return captures;
}

// ============================
// ЧИ Є ВЗЯТТЯ
// ============================

function hasAnyCapture(color) {
  return pieces.some((piece) => {
    if (piece.color !== color) {
      return false;
    }

    return getCaptures(piece).length > 0;
  });
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

  const captures = getCaptures(selectedPiece);

  const capture = captures.find((move) => move.row === row && move.col === col);

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
    const rowDiff = Math.abs(row - selectedPiece.row);

    const colDiff = Math.abs(col - selectedPiece.col);

    if (rowDiff !== colDiff) {
      return false;
    }

    const rowDirection = row > selectedPiece.row ? 1 : -1;

    const colDirection = col > selectedPiece.col ? 1 : -1;

    let checkRow = selectedPiece.row + rowDirection;

    let checkCol = selectedPiece.col + colDirection;

    while (checkRow !== row || checkCol !== col) {
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

  const direction = selectedPiece.color === "white" ? -1 : 1;

  const rowDiff = row - selectedPiece.row;

  const colDiff = Math.abs(col - selectedPiece.col);

  return rowDiff === direction && colDiff === 1;
}

// ============================
// ЧИ Є ЗВИЧАЙНИЙ ХІД
// ============================

function hasNormalMove(piece) {
  // DAMKA
  if (piece.king) {
    const directions = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ];

    for (const [dr, dc] of directions) {
      const row = piece.row + dr;
      const col = piece.col + dc;

      if (isInside(row, col) && !getPiece(row, col)) {
        return true;
      }
    }

    return false;
  }

  // NORMAL PIECE
  const direction = piece.color === "white" ? -1 : 1;

  const moves = [
    [direction, -1],
    [direction, 1],
  ];

  return moves.some(([dr, dc]) => {
    const row = piece.row + dr;
    const col = piece.col + dc;

    return isInside(row, col) && !getPiece(row, col);
  });
}


// ============================
// ЗМІНА ХОДУ
// ============================

function changeTurn() {
  currentPlayer = currentPlayer === "white" ? "black" : "white";

  updateTurn();
}
