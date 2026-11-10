function createBoard() {
  init3DScene();
  boardGrid.innerHTML = "";
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const cell = document.createElement("div");
      cell.classList.add("cell");
      cell.classList.add((row + col) % 2 === 0 ? "light" : "dark");
      cell.dataset.row = row;
      cell.dataset.col = col;
      boardGrid.appendChild(cell);
    }
  }
}
// ============================
// ОТРИМАТИ КЛІТИНКУ
// ============================

function getCell(row, col) {
  return boardGrid.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
}