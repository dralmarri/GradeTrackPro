// Shared sheet geometry for OMR generation AND scanning.
// All coordinates are in millimetres on an A4 page (210 × 297).
// The sheet generator draws bubbles at these exact positions and the
// scanner maps detected registration marks back to this space — so both
// sides always agree on where every bubble is.

import type { OmrExam } from "@/types/exam";

export const PAGE_W = 210;
export const PAGE_H = 297;

// Registration marks: filled black squares at the four corners.
export const MARK_SIZE = 12; // mm — matches the UX Pilot registration squares
// centers of the 4 marks (TL, TR, BL, BR)
export const MARKS = [
  { x: 16, y: 16 },
  { x: PAGE_W - 16, y: 16 },
  { x: 16, y: PAGE_H - 16 },
  { x: PAGE_W - 16, y: PAGE_H - 16 },
] as const;

// Orientation anchor: a small filled square next to the TL mark only.
// Four identical corner squares are rotationally ambiguous — an upside-down
// photo would otherwise solve a "valid" homography and misread every bubble.
// The scanner tries all 4 rotations and keeps the one where this dot is dark.
export const ORIENT_MARK = { x: PAGE_W - 26, y: 16, size: 6 } as const;

// Exam-code marks: a row of small squares (filled = bit 1) machine-encoding
// which exam a printed sheet belongs to — lets the scanner tell "this photo
// is exam X" WITHOUT the professor telling it, instead of only the printed
// (human-only) title/version text. It sits in a narrow machine-only row below
// the UX Pilot shading legend and remains clear of the corner search windows.
export const CODE_BITS = 10; // 0..1023 — plenty for any one course's exams
const CODE_MARK_SIZE = 2.4;
const CODE_MARK_PITCH = 4.6;
const CODE_MARK_Y = 91; // narrow machine-only row below the shading legend
export function codeMarkPos(bitIndex: number): { x: number; y: number; size: number } {
  const totalW = (CODE_BITS - 1) * CODE_MARK_PITCH;
  const startX = PAGE_W / 2 - totalW / 2;
  return { x: startX + bitIndex * CODE_MARK_PITCH, y: CODE_MARK_Y, size: CODE_MARK_SIZE };
}

// Deterministic short code for an exam id (stable across print → scan,
// computed fresh each time from the id — nothing new stored in the DB).
// Plain FNV-1a-style string hash, mod 2^CODE_BITS.
export function examCode(examId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < examId.length; i++) {
    h ^= examId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % (1 << CODE_BITS);
}

// Bubble radius and every pitch below were enlarged together (from the
// original 3.4mm bubble) for readability — bigger targets and more
// whitespace between rows/columns for students with lower vision, while
// keeping every bubble edge clear of its neighbours (no touching circles).
export const BUBBLE_R = 3.8;      // bubble radius (mm)

// Student-ID grid
const ID_COL_PITCH = 9.6;         // horizontal distance between digit columns
const ID_ROW_PITCH = 8.4;         // vertical distance between digits 0-9
const ID_TOP_Y = 78;
export const ID_PITCH = ID_COL_PITCH;

// Question grid
const Q_ROW_PITCH = 7.8;
const Q_CHOICE_PITCH = 11;
const Q_TOP_BUBBLES = 168;
const Q_TOP_WRITTEN = 108;
const Q_BOTTOM_Y = 260;
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
export const MAX_ROWS_PER_COL = Math.floor((Q_BOTTOM_Y - Q_TOP_BUBBLES) / Q_ROW_PITCH) + 1;
export const MAX_QUESTIONS = MAX_ROWS_PER_COL * Q_COL_XS.length;

export interface BubblePos { x: number; y: number }

// Center of ID bubble for digit column `col` (0-based, left→right) and digit d (0-9).
export function idBubble(exam: OmrExam, col: number, digit: number): BubblePos {
  const gridW = (exam.studentIdDigits - 1) * ID_COL_PITCH;
  const startX = (PAGE_W - gridW) / 2;
  return { x: startX + col * ID_COL_PITCH, y: ID_TOP_Y + digit * ID_ROW_PITCH };
}

// Question-grid spec: uses as FEW columns as possible and stretches the row
// pitch so the questions fill the page instead of crowding the top.
// Deterministic from the exam fields, so sheet and scanner always agree.
type GridExam = Pick<OmrExam, "questionCount" | "idMode">;

export interface GridSpec { cols: number; rows: number; pitch: number; colXs: number[] }

const COL_X_SETS: Record<number, number[]> = {
  1: [88],
  2: [48, 128],
  3: [28, 93, 158],
};

// Above this many questions, prefer two side-by-side columns even if a
// single tall column would technically still fit — reads as a proper
// answer sheet rather than one long list. The hard capacity limits
// (maxR, 2*maxR) still apply on top of this for very large exams.
const COMFORTABLE_SINGLE_COL = 12;

export function gridSpec(exam: GridExam): GridSpec {
  const maxR = maxRowsPerCol(exam);
  const n = Math.max(1, exam.questionCount);
  const singleColCap = Math.min(maxR, COMFORTABLE_SINGLE_COL);
  const cols = n <= singleColCap ? 1 : n <= 2 * maxR ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const avail = Q_BOTTOM_Y - qTopY(exam);
  const pitch = rows > 1
    ? Math.max(Q_ROW_PITCH, Math.min(13, avail / (rows - 1)))
    : Q_ROW_PITCH;
  return { cols, rows, pitch, colXs: COL_X_SETS[cols] };
}

// Center of the bubble for question q (0-based) and choice c (0-based).
export function questionBubble(exam: OmrExam, q: number, c: number): BubblePos {
  const spec = gridSpec(exam);
  // fill column by column: q 0..rows-1 in col 0, etc.
  const col = Math.floor(q / spec.rows);
  const row = q % spec.rows;
  if (col >= spec.colXs.length) {
    throw new Error(`عدد الأسئلة يتجاوز الحد الأقصى (${maxQuestions(exam)})`);
  }
  return { x: spec.colXs[col] + c * Q_CHOICE_PITCH, y: qTopY(exam) + row * spec.pitch };
}

export function questionRows(exam: OmrExam): number {
  return gridSpec(exam).rows;
}

export function questionNumberX(exam: GridExam, colIndex: number): number {
  return gridSpec(exam).colXs[colIndex] - 9;
}
