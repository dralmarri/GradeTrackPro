// Geometry for the "essay grading card" — a small self-contained scannable
// block (its own registration marks, not the full A4 page) where the
// professor bubbles in the score they're awarding each essay question after
// reading the student's handwritten answer. Printed on the answer sheet's
// essay page; photographed on its own (fill the camera frame with just the
// card), same UX as the main bubble sheet.
//
// Kept deliberately separate from layout.ts's page-1 geometry: the essay
// page is plain flowing HTML (question text wraps to unknown length), so
// nothing on it can share page 1's page-corner-anchored coordinate system.
// A small fixed-size card sidesteps that — its own corners, its own
// homography, unaffected by anything else on the page.

export const CARD_W = 170; // mm
export const CARD_PAD = 8; // mm — also the registration-mark inset
export const CARD_MARK_SIZE = 6; // mm — smaller than the page's 12mm marks, matches the card's smaller scale
export const CARD_ORIENT_SIZE = 3.5;
export const CARD_BUBBLE_R = 2.6;

const HEADER_H = 14; // mm — title + exam-code row
const ROW_H = 11; // mm per essay question
const CODE_BITS = 10;
const CODE_MARK_SIZE = 1.6;
const CODE_MARK_PITCH = 3;

// Max score a single bubble row can represent (digits 0..9). A question
// worth more than this still gets a row capped at 9 — grading essays to
// whole-point precision above 9 is rare, and the manual score entry stays
// as a fallback for anything the card can't represent.
export const MAX_ROW_SCORE = 9;

export function cardHeight(rowCount: number): number {
  return HEADER_H + rowCount * ROW_H + CARD_PAD;
}

export function cardMarks(rowCount: number): { x: number; y: number }[] {
  const h = cardHeight(rowCount);
  return [
    { x: CARD_PAD, y: CARD_PAD },
    { x: CARD_W - CARD_PAD, y: CARD_PAD },
    { x: CARD_PAD, y: h - CARD_PAD },
    { x: CARD_W - CARD_PAD, y: h - CARD_PAD },
  ];
}

export function cardOrientMark(): { x: number; y: number; size: number } {
  return { x: CARD_W - CARD_PAD - 10, y: CARD_PAD, size: CARD_ORIENT_SIZE };
}

// exam-code marks (same idea as layout.ts's codeMarkPos) so the scanner can
// confirm "this card belongs to this exam" before trusting the scores.
export function cardCodeBits(): number {
  return CODE_BITS;
}
export function cardCodeMarkPos(bitIndex: number): { x: number; y: number; size: number } {
  const totalW = (CODE_BITS - 1) * CODE_MARK_PITCH;
  const startX = CARD_W / 2 - totalW / 2;
  return { x: startX + bitIndex * CODE_MARK_PITCH, y: CARD_PAD + 3, size: CODE_MARK_SIZE };
}

// Center of the score bubble for essay question row `qi` (0-based) and
// digit `d` (0..min(9, maxScore)). Bubbles run right-to-left (0 at the
// right, matching the sheet's RTL reading order) starting just past the
// row's label.
export function essayScoreBubble(qi: number, d: number): { x: number; y: number } {
  const y = HEADER_H + qi * ROW_H + ROW_H / 2 + 2;
  const rightEdge = CARD_W - CARD_PAD - 34; // leave room for the label at the card's RTL start
  return { x: rightEdge - d * (CARD_BUBBLE_R * 2 + 1.2), y };
}

export function essayRowLabelY(qi: number): number {
  return HEADER_H + qi * ROW_H + ROW_H / 2 + 2;
}
