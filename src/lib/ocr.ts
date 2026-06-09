import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
// Bundle the worker via Vite so versions always match and it works offline
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as XLSX from "xlsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

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

/** Match free-form text lines to students + scores. */
export function matchLinesToGrades(
  lines: string[],
  students: { id: string; name: string }[],
  maxScore: number,
): OcrMatch[] {
  const studentTokens = students.map((s) => ({ id: s.id, name: s.name, toks: tokens(s.name) }));
  const used = new Set<string>();
  const matches: OcrMatch[] = [];

  for (const line of lines) {
    const nums = Array.from(line.matchAll(/\d+(?:[.,]\d+)?/g))
      .map((m) => parseFloat(m[0].replace(",", ".")))
      .filter((n) => !isNaN(n) && n >= 0 && n <= maxScore);
    if (!nums.length) continue;

    const lineToks = tokens(line);
    if (!lineToks.length) continue;

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

    if (best && best.overlap >= 1 && best.ratio >= 0.4) {
      const score = Math.max(0, Math.min(nums[nums.length - 1], maxScore));
      matches.push({ studentId: best.id, score });
      used.add(best.id);
    }
  }
  return matches;
}

/** OCR a single image (File or Blob) → array of text lines. */
async function ocrImageToLines(
  source: File | Blob,
  onProgress?: (pct: number) => void,
): Promise<string[]> {
  const { data } = await Tesseract.recognize(source, "ara+eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) onProgress(Math.round(m.progress * 100));
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyData = data as any;
  const raw: string[] = anyData.lines && anyData.lines.length
    ? anyData.lines.map((l: { text: string }) => l.text)
    : (data.text || "").split(/\n/);
  return raw.map((l) => l.trim()).filter(Boolean);
}

/** Extract lines from a PDF: digital text first, fall back to OCR for scanned pages. */
async function pdfToLines(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const allLines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = tc.items as any[];

    // Group items by approximate Y to reconstruct lines
    if (items.length > 5) {
      const rows = new Map<number, { y: number; parts: { x: number; s: string }[] }>();
      for (const it of items) {
        const str: string = it.str ?? "";
        if (!str.trim()) continue;
        const tr = it.transform as number[];
        const x = tr[4];
        const y = Math.round(tr[5]);
        const key = y;
        if (!rows.has(key)) rows.set(key, { y, parts: [] });
        rows.get(key)!.parts.push({ x, s: str });
      }
      const sorted = [...rows.values()].sort((a, b) => b.y - a.y);
      for (const r of sorted) {
        r.parts.sort((a, b) => a.x - b.x);
        const line = r.parts.map((p) => p.s).join(" ").replace(/\s+/g, " ").trim();
        if (line) allLines.push(line);
      }
    } else {
      // Likely scanned — render to canvas and OCR
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png")!);
      const ocrLines = await ocrImageToLines(blob, (pct) => {
        if (onProgress) onProgress(Math.round(((i - 1) / pdf.numPages) * 100 + pct / pdf.numPages));
      });
      allLines.push(...ocrLines);
    }

    if (onProgress) onProgress(Math.round((i / pdf.numPages) * 100));
  }
  return allLines;
}

/** Parse Excel / CSV — combine every row into a "name ... number" text line. */
async function spreadsheetToLines(file: File): Promise<string[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const lines: string[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });
    for (const row of rows) {
      if (!row || !row.length) continue;
      const parts = (row as unknown[]).map((c) => (c == null ? "" : String(c).trim())).filter(Boolean);
      if (parts.length) lines.push(parts.join(" "));
    }
  }
  return lines;
}

/**
 * Main entry: extract grades from an image, PDF, Excel, or CSV file.
 */
export async function extractGradesFromFile(
  file: File,
  students: { id: string; name: string }[],
  maxScore: number,
  onProgress?: (pct: number) => void,
): Promise<OcrMatch[]> {
  const name = file.name.toLowerCase();
  const type = file.type;

  let lines: string[];
  if (type.startsWith("image/")) {
    lines = await ocrImageToLines(file, onProgress);
  } else if (type === "application/pdf" || name.endsWith(".pdf")) {
    lines = await pdfToLines(file, onProgress);
  } else if (
    name.endsWith(".csv") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    type.includes("spreadsheet") ||
    type === "text/csv"
  ) {
    onProgress?.(50);
    lines = await spreadsheetToLines(file);
    onProgress?.(100);
  } else {
    throw new Error("صيغة الملف غير مدعومة. الصيغ المدعومة: صورة، PDF، Excel، CSV");
  }

  return matchLinesToGrades(lines, students, maxScore);
}

// Backwards-compat alias
export const ocrImageToGrades = extractGradesFromFile;
