import * as XLSX from "xlsx";

// Normalize Arabic text: unify alef/yaa/taa-marbuta, strip diacritics & tatweel
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/[ـ\.\,\،\:\;\(\)\[\]\{\}\-\_\/\\\|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokens(s: string): string[] {
  return normalizeArabic(s).split(" ").filter((t) => t.length >= 2);
}

export interface GradeMatch {
  studentId: string;
  studentName: string;
  score: number;
}

export interface ExcelImportResult {
  matches: GradeMatch[];
  unmatchedRows: { name: string; score: number }[];
  missingStudents: { id: string; name: string }[];
}

async function spreadsheetToRows(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const all: string[][] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
    for (const row of rows) {
      if (!row) continue;
      all.push((row as unknown[]).map((c) => (c == null ? "" : String(c).trim())));
    }
  }
  return all;
}

/**
 * Import grades from Excel/CSV. Matches rows to students by NAME (order-independent).
 * Each row should contain a student name cell and a numeric grade cell.
 */
export async function importGradesFromExcel(
  file: File,
  students: { id: string; name: string }[],
  maxScore: number,
): Promise<ExcelImportResult> {
  const rows = await spreadsheetToRows(file);
  if (!rows.length) throw new Error("الملف فارغ أو لا يحتوي على بيانات");

  const studentTokens = students.map((s) => ({ id: s.id, name: s.name, toks: tokens(s.name) }));
  const used = new Set<string>();
  const matches: GradeMatch[] = [];
  const unmatchedRows: { name: string; score: number }[] = [];

  for (const row of rows) {
    // Collect numeric cells in valid range
    const numCells: number[] = [];
    for (const cell of row) {
      const m = cell.match(/^-?\d+(?:[.,]\d+)?$/);
      if (m) {
        const n = parseFloat(cell.replace(",", "."));
        if (!isNaN(n) && n >= 0 && n <= maxScore) numCells.push(n);
      }
    }
    if (!numCells.length) continue;

    // Find the best matching student for any text cell in this row
    let bestRow: { id: string; name: string; overlap: number; ratio: number } | null = null;
    let nameCellText = "";

    for (const cell of row) {
      const cellToks = tokens(cell);
      if (cellToks.length < 1) continue;
      for (const s of studentTokens) {
        if (used.has(s.id)) continue;
        let overlap = 0;
        for (const t of s.toks) {
          if (cellToks.some((lt) => lt === t || lt.includes(t) || t.includes(lt))) overlap++;
        }
        const ratio = overlap / Math.max(1, s.toks.length);
        const minOverlap = s.toks.length === 1 ? 1 : 2;
        if (overlap >= minOverlap && ratio >= 0.5) {
          if (!bestRow || overlap > bestRow.overlap || (overlap === bestRow.overlap && ratio > bestRow.ratio)) {
            bestRow = { id: s.id, name: s.name, overlap, ratio };
            nameCellText = cell;
          }
        }
      }
    }

    // Largest valid number on the row is most likely the grade (not row index)
    const score = Math.max(...numCells);

    if (bestRow) {
      matches.push({ studentId: bestRow.id, studentName: bestRow.name, score });
      used.add(bestRow.id);
    } else {
      // Row had a number but we couldn't map it to any student
      const textCell = row.find((c) => tokens(c).length >= 1) || "";
      if (textCell) unmatchedRows.push({ name: textCell, score });
      // Suppress nameCellText unused warning
      void nameCellText;
    }
  }

  const missingStudents = students.filter((s) => !used.has(s.id));
  return { matches, unmatchedRows, missingStudents };
}
