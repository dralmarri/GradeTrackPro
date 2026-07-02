// Shared sheet geometry for OMR generation AND scanning.
// All coordinates are in millimetres on an A4 page (210 × 297).
// The sheet generator draws bubbles at these exact positions and the
// scanner maps detected registration marks back to this space — so both
// sides always agree on where every bubble is.

import { OmrExam } from "@/types/exam";

export const PAGE_W = 210;
export const PAGE_H = 297;

// Registration marks: filled black squares at the four corners.
export const MARK_SIZE = 10; // mm
// centers of the 4 marks (TL, TR, BL, BR)
export const MARKS = [
  { x: 11, y: 11 },
  { x: PAGE_W - 11, y: 11 },
  { x: 11, y: PAGE_H - 11 },
  { x: PAGE_W - 11, y: PAGE_H - 11 },
] as const;

// Orientation anchor: a small filled square next to the TL mark only.
// Four identical corner squares are rotationally ambiguous — an upside-down
// photo would otherwise solve a "valid" homography and misread every bubble.
// The scanner tries all 4 rotations and keeps the one where this dot is dark.
export const ORIENT_MARK = { x: 22.5, y: 11, size: 5 } as const;

export const BUBBLE_R = 2.5;      // bubble radius (mm)

// Student-ID grid
const ID_COL_PITCH = 8;           // horizontal distance between digit columns
const ID_ROW_PITCH = 6.0;         // vertical distance between digits 0-9
const ID_TOP_Y = 57.5;            // y of digit-0 row (below the handwritten boxes)
export const ID_PITCH = ID_COL_PITCH;

// Question grid
const Q_ROW_PITCH = 6.5;
const Q_CHOICE_PITCH = 8;
const Q_TOP_BUBBLES = 122;        // first question row when the bubble ID grid is present
const Q_TOP_WRITTEN = 64;         // first question row when the ID is handwritten-only
const Q_BOTTOM_Y = 278;
const Q_COL_XS = [28, 93, 158];   // x of choice "A" bubble per column block

type IdModeExam = Pick<OmrExam, "idMode">;

function qTopY(exam: IdModeExam): number {
  return exam.idMode === "written" ? Q_TOP_WRITTEN : Q_TOP_BUBBLES;
}

export function maxRowsPerCol(exam: IdModeExam): number {
  return Math.floor((Q_BOTTOM_Y - qTopY(exam)) / Q_ROW_PITCH) + 1;
}

export function maxQuestions(exam: IdModeExam): number {
  return maxRowsPerCol(exam) * Q_COL_XS.length;
}

// static cap used by the create-exam UI (bubble-grid mode, the smaller one)
export const MAX_ROWS_PER_COL = Math.floor((Q_BOTTOM_Y - Q_TOP_BUBBLES) / Q_ROW_PITCH) + 1; // 25
export const MAX_QUESTIONS = MAX_ROWS_PER_COL * Q_COL_XS.length; // 75

export interface BubblePos { x: number; y: number }

// Center of ID bubble for digit column `col` (0-based, left→right) and digit d (0-9).
export function idBubble(exam: OmrExam, col: number, digit: number): BubblePos {
  const gridW = (exam.studentIdDigits - 1) * ID_COL_PITCH;
  const startX = (PAGE_W - gridW) / 2;
  return { x: startX + col * ID_COL_PITCH, y: ID_TOP_Y + digit * ID_ROW_PITCH };
}

// Center of the bubble for question q (0-based) and choice c (0-based).
export function questionBubble(exam: OmrExam, q: number, c: number): BubblePos {
  const rows = questionRows(exam);
  // fill column by column: q 0..rows-1 in col 0, etc.
  const col = Math.floor(q / rows);
  const row = q % rows;
  if (col >= Q_COL_XS.length) {
    throw new Error(`عدد الأسئلة يتجاوز الحد الأقصى (${maxQuestions(exam)})`);
  }
  return { x: Q_COL_XS[col] + c * Q_CHOICE_PITCH, y: qTopY(exam) + row * Q_ROW_PITCH };
}

export function questionRows(exam: OmrExam): number {
  return Math.min(maxRowsPerCol(exam), Math.ceil(exam.questionCount / Q_COL_XS.length) || 1);
}

export function questionNumberX(colIndex: number): number {
  return Q_COL_XS[colIndex] - 9;
}
