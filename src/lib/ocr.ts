import Tesseract from "tesseract.js";

// Normalize Arabic text: unify alef/yaa/taa-marbuta, strip diacritics & tatweel
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "") // diacritics
    .replace(/\u0640/g, "") // tatweel
    .replace(/[\u0622\u0623\u0625]/g, "\u0627") // أ إ آ -> ا
    .replace(/\u0649/g, "\u064A") // ى -> ي
    .replace(/\u0629/g, "\u0647") // ة -> ه
    .replace(/[ـ\.\,\،\:\;\(\)\[\]\{\}\-\_\/\\\|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokens(s: string): string[] {
  return normalizeArabic(s).split(" ").filter((t) => t.length >= 2);
}

export interface OcrMatch {
  studentId: string;
  score: number;
}

/**
 * Run Tesseract OCR on an image file and match each line to a student name,
 * extracting a numeric score (<= maxScore).
 */
export async function ocrImageToGrades(
  file: File,
  students: { id: string; name: string }[],
  maxScore: number,
  onProgress?: (pct: number) => void,
): Promise<OcrMatch[]> {
  const { data } = await Tesseract.recognize(file, "ara+eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });

  const anyData = data as any;
  const rawLines: string[] = anyData.lines && anyData.lines.length
    ? anyData.lines.map((l: any) => l.text as string)
    : (data.text || "").split(/\n/);
  const lines: string[] = rawLines.map((l) => l.trim()).filter(Boolean);

  // Precompute tokens for each student
  const studentTokens = students.map((s) => ({
    id: s.id,
    name: s.name,
    toks: tokens(s.name),
  }));

  const used = new Set<string>();
  const matches: OcrMatch[] = [];

  for (const line of lines) {
    // Extract candidate numbers (integers or decimals) in [0, maxScore]
    const nums = Array.from(line.matchAll(/\d+(?:[.,]\d+)?/g))
      .map((m) => parseFloat(m[0].replace(",", ".")))
      .filter((n) => !isNaN(n) && n >= 0 && n <= maxScore);
    if (!nums.length) continue;

    const lineToks = tokens(line);
    if (!lineToks.length) continue;

    // Score each unused student by token overlap with the line
    let best: { id: string; overlap: number; ratio: number } | null = null;
    for (const s of studentTokens) {
      if (used.has(s.id)) continue;
      let overlap = 0;
      for (const t of s.toks) {
        if (lineToks.some((lt) => lt === t || lt.includes(t) || t.includes(lt))) overlap++;
      }
      const ratio = overlap / Math.max(1, s.toks.length);
      if (!best || overlap > best.overlap || (overlap === best.overlap && ratio > best.ratio)) {
        best = { id: s.id, overlap, ratio };
      }
    }

    // Require at least 1 token overlap AND >= 40% of name tokens matched
    if (best && best.overlap >= 1 && best.ratio >= 0.4) {
      // Take the LAST number on the line (scores usually at end)
      const score = Math.max(0, Math.min(nums[nums.length - 1], maxScore));
      matches.push({ studentId: best.id, score });
      used.add(best.id);
    }
  }

  return matches;
}
