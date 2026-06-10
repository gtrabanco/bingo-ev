// Win detection, real-cartón rules: a línea is a ROW whose situation cells
// are all marked (blanks don't count, like the blanks of a 90-ball cartón);
// bingo is every situation cell on the card. No columns, no diagonals.
import { COLS, ROWS } from './card';

type Cells = (string | null)[];

function situationIndexesOfRow(cells: Cells, row: number): number[] {
  const indexes: number[] = [];
  for (let col = 0; col < COLS; col++) {
    const index = row * COLS + col;
    if (cells[index] !== null) indexes.push(index);
  }
  return indexes;
}

export function completedRows(cells: Cells, marks: boolean[]): number[] {
  const rows: number[] = [];
  for (let row = 0; row < ROWS; row++) {
    const indexes = situationIndexesOfRow(cells, row);
    if (indexes.length > 0 && indexes.every((index) => marks[index])) rows.push(row);
  }
  return rows;
}

export function isFullCard(cells: Cells, marks: boolean[]): boolean {
  const indexes = cells.flatMap((cell, index) => (cell !== null ? [index] : []));
  return indexes.length > 0 && indexes.every((index) => marks[index]);
}

export function cellsInCompletedRows(cells: Cells, marks: boolean[]): Set<number> {
  const highlighted = new Set<number>();
  for (const row of completedRows(cells, marks)) {
    for (const index of situationIndexesOfRow(cells, row)) highlighted.add(index);
  }
  return highlighted;
}

export function markedCount(cells: Cells, marks: boolean[]): number {
  return marks.filter((mark, index) => mark && cells[index] !== null).length;
}
