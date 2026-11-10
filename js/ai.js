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
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // ============================
  // MEDIUM
  // ============================

  function getMediumMove(moves) {
    let bestMoves = [];
    let bestScore = -Infinity;

    moves.forEach((option) => {
      let score = 0;

      const piece = option.piece;
      const move = option.move;

      // Взяття — хороший хід
      if (option.capture) {
        score += 10;
      }

      // Стати дамкою — дуже хороший хід
      if (!piece.king && move.row === SIZE - 1) {
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

    return bestMoves[Math.floor(Math.random() * bestMoves.length)];
  }

  // ============================
  // HARD AI
  // ============================

  function getHardMove(moves) {
    let bestMove = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const newBoard = simulateMove(pieces, move);

      const movedPiece = getPieceFromBoard(
        newBoard,
        move.move.row,
        move.move.col,
      );

      // Перевіряємо продовження взяття
      const canContinueCapture =
        move.capture &&
        movedPiece &&
        getCapturesFromBoard(newBoard, movedPiece).length > 0;

      const score = minimax(
        newBoard,
        7,
        canContinueCapture ? "black" : "white",
        canContinueCapture
          ? { row: movedPiece.row, col: movedPiece.col }
          : null,
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

  function minimax(boardState, depth, color, forcedPiece = null) {
    // Оцінюємо дошку, якщо глибину пошуку вичерпано
    if (depth <= 0 && !forcedPiece) {
      return evaluateBoard(boardState);
    }

    let moves = [];

    // Продовження серії взяттів тією самою шашкою
    if (forcedPiece) {
      const piece = getPieceFromBoard(
        boardState,
        forcedPiece.row,
        forcedPiece.col,
      );

      if (piece) {
        moves = getCapturesFromBoard(boardState, piece).map((capture) => ({
          piece: piece,
          move: capture,
          capture: true,
        }));
      }

      // Серія взяттів завершилася — хід переходить супернику
      if (moves.length === 0) {
        return minimax(
          boardState,
          depth,
          color === "black" ? "white" : "black",
        );
      }
    } else {
      moves = getAllMoves(boardState, color);
    }

    // Перевірка, чи є доступні ходи
    if (moves.length === 0) {
      return color === "black" ? -10000 : 10000;
    }

    const maximizingPlayer = color === "black";

    let bestScore = maximizingPlayer ? -Infinity : Infinity;

    for (const move of moves) {
      const newBoard = simulateMove(boardState, move);

      const movedPiece = getPieceFromBoard(
        newBoard,
        move.move.row,
        move.move.col,
      );

      // Перевіряємо, чи потрібно продовжувати взяття
      const canContinueCapture =
        move.capture &&
        movedPiece &&
        getCapturesFromBoard(newBoard, movedPiece).length > 0;

      const nextColor = canContinueCapture
        ? color
        : color === "black"
          ? "white"
          : "black";

      // Під час серії взяттів глибина не зменшується
      const nextDepth = canContinueCapture ? depth : depth - 1;

      const nextForcedPiece = canContinueCapture
        ? { row: movedPiece.row, col: movedPiece.col }
        : null;

      const score = minimax(
        newBoard,
        nextDepth,
        nextColor,
        nextForcedPiece,
      );

      if (maximizingPlayer) {
        bestScore = Math.max(bestScore, score);
      } else {
        bestScore = Math.min(bestScore, score);
      }
    }

    return bestScore;
  }

  // ============================
  // ОЦІНКА ДОШКИ
  // ============================

  function evaluateBoard(boardState) {
    let score = 0;

    boardState.forEach((piece) => {
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

    const mustCapture = hasCaptureInBoard(boardState, color);

    boardState.forEach((piece) => {
      if (piece.color !== color) {
        return;
      }

      // ----------------------------
      // Якщо треба бити
      // ----------------------------

      if (mustCapture) {
        const captures = getCapturesFromBoard(boardState, piece);

        captures.forEach((capture) => {
          moves.push({
            piece: piece,
            move: capture,
            capture: true,
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
          [1, 1],
        ];

        directions.forEach(([dr, dc]) => {
          let row = piece.row + dr;

          let col = piece.col + dc;

          while (isInside(row, col)) {
            if (getPieceFromBoard(boardState, row, col)) {
              break;
            }

            moves.push({
              piece: piece,
              move: {
                row: row,
                col: col,
              },
              capture: false,
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

      const direction = color === "black" ? 1 : -1;

      const directions = [
        [direction, -1],
        [direction, 1],
      ];

      directions.forEach(([dr, dc]) => {
        const row = piece.row + dr;

        const col = piece.col + dc;

        if (isInside(row, col) && !getPieceFromBoard(boardState, row, col)) {
          moves.push({
            piece: piece,
            move: {
              row: row,
              col: col,
            },
            capture: false,
          });
        }
      });
    });

    return moves;
  }

  // ============================
  // ПЕРЕВІРКА ВЗЯТТЯ
  // ============================

  function hasCaptureInBoard(boardState, color) {
    return boardState.some((piece) => {
      if (piece.color !== color) {
        return false;
      }

      return getCapturesFromBoard(boardState, piece).length > 0;
    });
  }

  // ============================
  // ВЗЯТТЯ НА КОПІЇ ДОШКИ
  // ============================

  function getCapturesFromBoard(boardState, piece) {
    const captures = [];

    // ----------------------------
    // ДАМКА
    // ----------------------------

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
          const target = getPieceFromBoard(boardState, row, col);

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

          // Своя шашка
          if (target.color === piece.color) {
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

      const enemy = getPieceFromBoard(boardState, enemyRow, enemyCol);

      const landing = getPieceFromBoard(boardState, landingRow, landingCol);

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
  // ОТРИМАТИ ШАШКУ З КОПІЇ
  // ============================

  function getPieceFromBoard(boardState, row, col) {
    return boardState.find((piece) => piece.row === row && piece.col === col);
  }

  // ============================
  // СИМУЛЯЦІЯ ХОДУ
  // ============================

  function simulateMove(boardState, option) {
    // Створюємо копію дошки
    const newBoard = boardState.map((piece) => ({
      row: piece.row,
      col: piece.col,
      color: piece.color,
      king: piece.king,
    }));

    // Знаходимо шашку
    const piece = newBoard.find(
      (p) =>
        p.row === option.piece.row &&
        p.col === option.piece.col &&
        p.color === option.piece.color,
    );

    if (!piece) {
      return newBoard;
    }

    // ----------------------------
    // ВИДАЛЕННЯ ВОРОГА
    // ----------------------------

    if (option.capture && option.move.enemy) {
      const enemy = newBoard.find(
        (p) =>
          p.row === option.move.enemy.row &&
          p.col === option.move.enemy.col &&
          p.color === option.move.enemy.color,
      );

      if (enemy) {
        const index = newBoard.indexOf(enemy);

        newBoard.splice(index, 1);
      }
    }

    // ----------------------------
    // РУХ
    // ----------------------------

    piece.row = option.move.row;

    piece.col = option.move.col;

    // ----------------------------
    // ДАМКА
    // ----------------------------

    if (piece.color === "black" && piece.row === SIZE - 1) {
      piece.king = true;
    }

    if (piece.color === "white" && piece.row === 0) {
      piece.king = true;
    }

    return newBoard;
  }

  // ============================
  // ПРОДОВЖЕННЯ ВЗЯТТЯ
  // ============================

  if (aiCapturing && selectedPiece) {
    const captures = getCaptures(selectedPiece);

    captures.forEach((move) => {
      possibleMoves.push({
        piece: selectedPiece,
        move: move,
        capture: true,
      });
    });
  }

  // ============================
  // НОВИЙ ХІД AI
  // ============================

  if (!aiCapturing && !selectedPiece) {
    const mustCapture = hasAnyCapture("black");

    // ============================
    // ОБОВ'ЯЗКОВЕ ВЗЯТТЯ
    // ============================

    if (mustCapture) {
      pieces.forEach((piece) => {
        if (piece.color !== "black") {
          return;
        }

        const captures = getCaptures(piece);

        captures.forEach((move) => {
          possibleMoves.push({
            piece: piece,
            move: move,
            capture: true,
          });
        });
      });
    } else {
      // ============================
      // ЗВИЧАЙНІ ХОДИ
      // ============================

      pieces.forEach((piece) => {
        if (piece.color !== "black") {
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

              possibleMoves.push({
                piece: piece,
                move: {
                  row: row,
                  col: col,
                },
                capture: false,
              });

              row += dr;
              col += dc;
            }
          });
        } else {
          // ============================
          // ЗВИЧАЙНА ШАШКА
          // ============================

          const direction = 1;

          const moves = [
            [direction, -1],
            [direction, 1],
          ];

          moves.forEach(([dr, dc]) => {
            const row = piece.row + dr;

            const col = piece.col + dc;

            if (isInside(row, col) && !getPiece(row, col)) {
              possibleMoves.push({
                piece: piece,
                move: {
                  row: row,
                  col: col,
                },
                capture: false,
              });
            }
          });
        }
      });
    }
  }

  // ============================
  // НЕМАЄ ХОДІВ
  // ============================

  if (possibleMoves.length === 0) {
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

  selectedPiece = choice.piece;

  movePiece(choice.move.row, choice.move.col);
}