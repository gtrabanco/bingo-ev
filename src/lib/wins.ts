// Win detection, real-cartón rules: a línea is a ROW whose situation cells
// are all marked (blanks don't count, like the blanks of a 90-ball cartón);
// bingo is every situation cell on the card. No columns, no diagonals.
// Any mark kind counts: suffering a misfortune or causing it both fill the box.
//
// Rows are the CANONICAL landscape rows (3 rows x 4 cols). Portrait screens
// render the card transposed, so there a completed línea lights up vertically
// — same cells, same win, independent of how the grid is displayed.
import { COLS, ROWS, type MarkKind } from './card';

type Cells = (string | null)[];

function situationIndexesOfRow(cells: Cells, row: number): number[] {
  const indexes: number[] = [];
  for (let col = 0; col < COLS; col++) {
    const index = row * COLS + col;
    if (cells[index] !== null) indexes.push(index);
  }
  return indexes;
}

export function completedRows(cells: Cells, marks: MarkKind[]): number[] {
  const rows: number[] = [];
  for (let row = 0; row < ROWS; row++) {
    const indexes = situationIndexesOfRow(cells, row);
    if (indexes.length > 0 && indexes.every((index) => (marks[index] ?? 0) > 0)) rows.push(row);
  }
  return rows;
}

export function isFullCard(cells: Cells, marks: MarkKind[]): boolean {
  const indexes = cells.flatMap((cell, index) => (cell !== null ? [index] : []));
  return indexes.length > 0 && indexes.every((index) => (marks[index] ?? 0) > 0);
}

export function cellsInCompletedRows(cells: Cells, marks: MarkKind[]): Set<number> {
  const highlighted = new Set<number>();
  for (const row of completedRows(cells, marks)) {
    for (const index of situationIndexesOfRow(cells, row)) highlighted.add(index);
  }
  return highlighted;
}

export function markedCount(cells: Cells, marks: MarkKind[]): number {
  return marks.filter((mark, index) => mark > 0 && cells[index] !== null).length;
}
