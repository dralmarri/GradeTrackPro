import { describe, expect, it } from "vitest";
import {
  CARD_W, CARD_PAD, cardHeight, cardMarks, cardOrientMark, cardCodeMarkPos, essayScoreBubble, MAX_ROW_SCORE,
} from "@/lib/omr/essayCardLayout";

describe("essay grading card geometry", () => {
  it("grows with the number of essay questions and stays a valid card size", () => {
    expect(cardHeight(1)).toBeGreaterThan(0);
    expect(cardHeight(3)).toBeGreaterThan(cardHeight(1));
  });

  it("keeps the 4 registration marks at the card's own corners, inset by CARD_PAD", () => {
    const marks = cardMarks(2);
    expect(marks).toHaveLength(4);
    for (const m of marks) {
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x).toBeLessThanOrEqual(CARD_W);
    }
    // top-left/top-right share y, bottom-left/bottom-right share y
    expect(marks[0].y).toBe(marks[1].y);
    expect(marks[2].y).toBe(marks[3].y);
    expect(marks[0].y).toBe(CARD_PAD);
  });

  it("keeps the orientation mark and exam-code marks within the card bounds", () => {
    const orient = cardOrientMark();
    expect(orient.x).toBeGreaterThan(0);
    expect(orient.x).toBeLessThan(CARD_W);
    const p0 = cardCodeMarkPos(0);
    const p9 = cardCodeMarkPos(9);
    expect(p0.x).toBeGreaterThan(0);
    expect(p9.x).toBeLessThan(CARD_W);
  });

  it("lays out every score bubble (0..MAX_ROW_SCORE) inside the card, never overlapping the label area", () => {
    const h = cardHeight(3);
    for (let qi = 0; qi < 3; qi++) {
      for (let d = 0; d <= MAX_ROW_SCORE; d++) {
        const p = essayScoreBubble(qi, d);
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThanOrEqual(CARD_W - CARD_PAD - 34); // stays clear of the label's reserved width
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(h);
      }
    }
  });

  it("bubbles for consecutive digits never touch (spacing exceeds 2x bubble radius)", () => {
    const p0 = essayScoreBubble(0, 0);
    const p1 = essayScoreBubble(0, 1);
    expect(Math.abs(p0.x - p1.x)).toBeGreaterThan(2 * 2.6); // > 2*CARD_BUBBLE_R
  });
});
