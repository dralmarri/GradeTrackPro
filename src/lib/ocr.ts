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

async function firstSheetRows(file: File): Promise<string[][]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  if (!wb.SheetNames.length) return [];
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: "" });
  return rows.map((r) => (r as unknown[]).map((c) => (c == null ? "" : String(c).trim())));
}

const EXAM_KEYWORDS: Record<string, string[]> = {
  exam1: ["اختبار اول", "اختبار 1", "اختبار١", "الاختبار الاول", "الاختبار الأول", "اول", "الأول"],
  exam2: ["اختبار ثاني", "اختبار 2", "اختبار٢", "الاختبار الثاني", "ثاني", "الثاني"],
  finalExam: ["نهائي", "النهائي", "اختبار نهائي", "final"],
  participation: ["مشاركة", "المشاركة"],
  homework: ["واجب", "الواجب", "homework"],
};

function headerMatchesExam(header: string, examKey?: string): boolean {
  if (!examKey) return false;
  const list = EXAM_KEYWORDS[examKey];
  if (!list) return false;
  const h = normalizeArabic(header);
  return list.some((k) => h.includes(normalizeArabic(k)));
}

/**
 * Import grades from Excel/CSV. Reads only the first sheet.
 * Detects score column from header when possible; otherwise picks the largest valid
 * number in each row. Matches students by name (order-independent).
 */
export async function importGradesFromExcel(
  file: File,
  students: { id: string; name: string }[],
  maxScore: number,
  examKey?: string,
): Promise<ExcelImportResult> {
  const rows = await firstSheetRows(file);
  if (!rows.length) throw new Error("الملف فارغ أو لا يحتوي على بيانات");

  // Detect header row, name column, and score column from first 3 rows
  let scoreCol = -1;
  let nameCol = -1;
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 3); i++) {
    const r = rows[i];
    for (let c = 0; c < r.length; c++) {
      const cell = r[c];
      if (scoreCol === -1 && headerMatchesExam(cell, examKey)) {
        scoreCol = c;
        if (headerRowIdx === -1) headerRowIdx = i;
      }
      if (nameCol === -1) {
        const n = normalizeArabic(cell);
        if (n.includes("اسم") || n === "name") {
          nameCol = c;
          if (headerRowIdx === -1) headerRowIdx = i;
        }
      }
    }
  }

  const dataRows = headerRowIdx >= 0 ? rows.slice(headerRowIdx + 1) : rows;
  const studentTokens = students.map((s) => ({ id: s.id, name: s.name, toks: tokens(s.name) }));
  const used = new Set<string>();
  const matches: GradeMatch[] = [];
  const unmatchedRows: { name: string; score: number }[] = [];

  for (const row of dataRows) {
    let score: number | null = null;
    if (scoreCol >= 0 && scoreCol < row.length) {
      const cell = row[scoreCol];
      const m = cell.match(/^-?\d+(?:[.,]\d+)?$/);
      if (m) {
        const n = parseFloat(cell.replace(",", "."));
        if (!isNaN(n) && n >= 0) score = n;
      }
    } else {
      const numCells: number[] = [];
      for (let i = 0; i < row.length; i++) {
        if (i === nameCol) continue;
        const cell = row[i];
        const m = cell.match(/^-?\d+(?:[.,]\d+)?$/);
        if (m) {
          const n = parseFloat(cell.replace(",", "."));
          if (!isNaN(n) && n >= 0 && n <= maxScore) numCells.push(n);
        }
      }
      if (numCells.length) score = Math.max(...numCells);
    }
    if (score === null) continue;

    let bestRow: { id: string; name: string; overlap: number; ratio: number } | null = null;
    const candidateCells = nameCol >= 0 && nameCol < row.length ? [row[nameCol]] : row;
    for (const cell of candidateCells) {
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
          }
        }
      }
    }

    if (bestRow) {
      matches.push({ studentId: bestRow.id, studentName: bestRow.name, score });
      used.add(bestRow.id);
    } else {
      const textCell = (nameCol >= 0 && nameCol < row.length ? row[nameCol] : row.find((c) => tokens(c).length >= 1)) || "";
      if (textCell) unmatchedRows.push({ name: textCell, score });
    }
  }

  const missingStudents = students.filter((s) => !used.has(s.id));
  return { matches, unmatchedRows, missingStudents };
}
