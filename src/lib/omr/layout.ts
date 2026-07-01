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

export const BUBBLE_R = 2.5;      // bubble radius (mm)

// Student-ID grid
const ID_COL_PITCH = 8;           // horizontal distance between digit columns
const ID_ROW_PITCH = 6.5;         // vertical distance between digits 0-9
const ID_TOP_Y = 46;              // y of digit-0 row

// Question grid
const Q_ROW_PITCH = 6.5;
const Q_CHOICE_PITCH = 8;
const Q_TOP_Y = 122;              // first question row
const Q_BOTTOM_Y = 278;
const Q_COL_XS = [28, 93, 158];   // x of choice "A" bubble per column block
export const MAX_ROWS_PER_COL = Math.floor((Q_BOTTOM_Y - Q_TOP_Y) / Q_ROW_PITCH) + 1; // 25
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
  const rows = Math.min(MAX_ROWS_PER_COL, Math.ceil(exam.questionCount / Q_COL_XS.length) || 1);
  // fill column by column: q 0..rows-1 in col 0, etc.
  const col = Math.floor(q / rows);
  const row = q % rows;
  return { x: Q_COL_XS[col] + c * Q_CHOICE_PITCH, y: Q_TOP_Y + row * Q_ROW_PITCH };
}

export function questionRows(exam: OmrExam): number {
  return Math.min(MAX_ROWS_PER_COL, Math.ceil(exam.questionCount / Q_COL_XS.length) || 1);
}

export function questionNumberX(colIndex: number): number {
  return Q_COL_XS[colIndex] - 9;
}
