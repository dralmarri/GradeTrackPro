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

function compactName(input: string): string {
  return normalizeArabic(input).replace(/\s+/g, "");
}

function tokens(s: string): string[] {
  return normalizeArabic(s).split(" ").filter((t) => t.length >= 2);
}

function isHeaderLike(cell: string): boolean {
  const n = normalizeArabic(cell);
  const toks = n.split(" ").filter(Boolean);
  if (!toks.length) return false;
  // Whole-token header keywords only (avoid matching student names like "أسماء" which contains "اسم")
  const HEADER_TOKENS = new Set([
    "اسم", "الاسم", "الطالب", "الطالبه", "الطالبة",
    "اختبار", "الاختبار", "مشاركه", "المشاركه", "واجب", "الواجب",
    "المجموع", "مجموع", "نهائي", "النهائي", "البونص", "بونص",
    "اول", "الاول", "ثاني", "الثاني", "name", "student", "score", "grade",
  ]);
  // Header row: at least one token is a known header keyword AND the row has no
  // long person-name structure (a student name is typically 3+ tokens).
  const hasHeaderTok = toks.some((t) => HEADER_TOKENS.has(t));
  if (!hasHeaderTok) return false;
  // If it looks like a full personal name (>=3 tokens and not "اسم الطالب" style), treat as name.
  if (toks.length >= 3 && !toks.includes("اسم") && !toks.includes("الاسم") && !toks.includes("الطالب")) return false;
  return true;
}

function isNameHeader(cell: string): boolean {
  const toks = normalizeArabic(cell).split(" ").filter(Boolean);
  return toks.includes("اسم") || toks.includes("الاسم") || toks.includes("الطالب") || toks.includes("الطالبه") || toks.includes("الطالبة") || toks.includes("name") || toks.includes("student");
}

function parseScore(cell: string, maxScore: number, strictColumn: boolean): number | null {
  const value = cell.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).trim();
  const exact = value.match(/^-?\d+(?:[.,]\d+)?$/);
  const loose = strictColumn ? value.match(/-?\d+(?:[.,]\d+)?/) : exact;
  const match = exact || loose;
  if (!match) return null;
  const n = parseFloat(match[0].replace(",", "."));
  if (Number.isNaN(n) || n < 0 || n > maxScore) return null;
  return n;
}

export interface GradeMatch {
  studentId: string;
  studentName: string;
  score: number;
  scores?: Partial<Record<ExcelGradeKey, number>>;
}

export type ExcelGradeKey = "exam1" | "exam2" | "finalExam" | "participation" | "homework";

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

const EXAM_KEYS: ExcelGradeKey[] = ["exam1", "exam2", "finalExam", "participation", "homework"];

const EXAM_KEYWORDS: Record<ExcelGradeKey, string[]> = {
  exam1: ["اختبار اول", "اختبار 1", "اختبار١", "الاختبار الاول", "الاختبار الأول", "اول", "الأول"],
  exam2: ["اختبار ثاني", "اختبار 2", "اختبار٢", "الاختبار الثاني", "ثاني", "الثاني"],
  finalExam: ["نهائي", "النهائي", "اختبار نهائي", "final"],
  participation: ["مشاركة", "المشاركة"],
  homework: ["واجب", "الواجب", "homework"],
};

const EXAM_LABELS: Record<ExcelGradeKey, string> = {
  exam1: "الاختبار الأول",
  exam2: "الاختبار الثاني",
  finalExam: "الاختبار النهائي",
  participation: "المشاركة",
  homework: "الواجب",
};

function headerMatchesExam(header: string, examKey?: string): boolean {
  if (!examKey) return false;
  const list = EXAM_KEYWORDS[examKey];
  if (!list) return false;
  const h = normalizeArabic(header);
  return list.some((k) => h.includes(normalizeArabic(k)));
}

function findStudentMatch(
  nameCell: string,
  students: { id: string; name: string; toks: string[]; compact: string }[],
  used: Set<string>,
): { id: string; name: string } | null {
  const nameCompact = compactName(nameCell);
  const exact = students.find((s) => !used.has(s.id) && s.compact === nameCompact);
  if (exact) return exact;

  const cellToks = tokens(nameCell);
  if (cellToks.length < 2) return null;

  const candidates = students
    .filter((s) => !used.has(s.id))
    .map((s) => {
      const overlap = s.toks.filter((t) => cellToks.some((ct) => ct === t || (t.length >= 4 && ct.length >= 4 && (ct.includes(t) || t.includes(ct))))).length;
      const ratio = overlap / Math.max(1, s.toks.length);
      const reverseRatio = overlap / Math.max(1, cellToks.length);
      return { ...s, overlap, ratio, reverseRatio, score: ratio + reverseRatio + overlap / 10 };
    })
    .filter((s) => s.overlap >= 3 && s.ratio >= 0.75 && s.reverseRatio >= 0.6)
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) return null;
  if (candidates.length > 1 && candidates[0].score - candidates[1].score < 0.25) return null;
  return candidates[0];
}

/**
 * Import grades from Excel/CSV. Reads only the first sheet and only the first
 * contiguous student table after the detected header. Matches by name, never row order.
 */
export async function importGradesFromExcel(
  file: File,
  students: { id: string; name: string }[],
  maxScore: number,
  examKey?: string,
): Promise<ExcelImportResult> {
  const rows = await firstSheetRows(file);
  if (!rows.length) throw new Error("الملف فارغ أو لا يحتوي على بيانات");

  let scoreCol = -1;
  let nameCol = -1;
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = rows[i];
    for (let c = 0; c < r.length; c++) {
      const cell = r[c];
      if (scoreCol === -1 && headerMatchesExam(cell, examKey)) {
        scoreCol = c;
        headerRowIdx = Math.max(headerRowIdx, i);
      }
      if (nameCol === -1) {
        if (isNameHeader(cell)) {
          nameCol = c;
          headerRowIdx = Math.max(headerRowIdx, i);
        }
      }
    }
  }

  if (examKey && scoreCol === -1) {
    throw new Error(`لم أجد عمود "${EXAM_LABELS[examKey] || "الدرجة"}" في الملف. تأكد من عنوان العمود ثم أعد الاستيراد.`);
  }

  const sourceRows = headerRowIdx >= 0 ? rows.slice(headerRowIdx + 1) : rows;
  const studentTokens = students.map((s) => ({ id: s.id, name: s.name, toks: tokens(s.name), compact: compactName(s.name) }));
  const used = new Set<string>();
  const matches: GradeMatch[] = [];
  const unmatchedRows: { name: string; score: number }[] = [];
  let plausibleNameRows = 0;

  for (const row of sourceRows) {
    const nameCell = (nameCol >= 0 && nameCol < row.length ? row[nameCol] : row.find((c) => tokens(c).length >= 2)) || "";
    const nameToks = tokens(nameCell);

    if (nameCol >= 0) {
      if (!nameCell || isHeaderLike(nameCell)) {
        if (plausibleNameRows > 0) break;
        continue;
      }
      if (nameToks.length < 2) continue;
      plausibleNameRows++;
      if (plausibleNameRows > students.length + 10) break;
    }

    let score: number | null = null;
    if (scoreCol >= 0 && scoreCol < row.length) {
      score = parseScore(row[scoreCol], maxScore, true);
    } else {
      const numCells: number[] = [];
      for (let i = 0; i < row.length; i++) {
        if (i === nameCol) continue;
        const n = parseScore(row[i], maxScore, false);
        if (n !== null) numCells.push(n);
      }
      if (numCells.length) score = Math.max(...numCells);
    }
    if (score === null) continue;

    const bestRow = findStudentMatch(nameCell, studentTokens, used);
    if (bestRow) {
      matches.push({ studentId: bestRow.id, studentName: bestRow.name, score });
      used.add(bestRow.id);
    } else if (nameCell) {
      unmatchedRows.push({ name: nameCell, score });
    }
  }

  const missingStudents = students.filter((s) => !used.has(s.id));
  return { matches, unmatchedRows, missingStudents };
}

export async function importAllGradesFromExcel(
  file: File,
  students: { id: string; name: string }[],
  maxScores: Record<ExcelGradeKey, number>,
): Promise<ExcelImportResult> {
  const rows = await firstSheetRows(file);
  if (!rows.length) throw new Error("الملف فارغ أو لا يحتوي على بيانات");

  const scoreCols: Partial<Record<ExcelGradeKey, number>> = {};
  let nameCol = -1;
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const r = rows[i];
    for (let c = 0; c < r.length; c++) {
      const cell = r[c];
      for (const key of EXAM_KEYS) {
        if (scoreCols[key] === undefined && headerMatchesExam(cell, key)) {
          scoreCols[key] = c;
          headerRowIdx = Math.max(headerRowIdx, i);
        }
      }
      if (nameCol === -1 && isNameHeader(cell)) {
        nameCol = c;
        headerRowIdx = Math.max(headerRowIdx, i);
      }
    }
  }

  if (!Object.keys(scoreCols).length) {
    throw new Error("لم أجد أعمدة الاختبارات في الملف. تأكد من وجود عناوين مثل: اختبار أول، اختبار ثاني، نهائي، مشاركة، واجب.");
  }

  const sourceRows = headerRowIdx >= 0 ? rows.slice(headerRowIdx + 1) : rows;
  const studentTokens = students.map((s) => ({ id: s.id, name: s.name, toks: tokens(s.name), compact: compactName(s.name) }));
  const used = new Set<string>();
  const matches: GradeMatch[] = [];
  const unmatchedRows: { name: string; score: number }[] = [];
  let plausibleNameRows = 0;

  for (const row of sourceRows) {
    const nameCell = (nameCol >= 0 && nameCol < row.length ? row[nameCol] : row.find((c) => tokens(c).length >= 2)) || "";
    const nameToks = tokens(nameCell);

    if (nameCol >= 0) {
      if (!nameCell || isHeaderLike(nameCell)) {
        if (plausibleNameRows > 0) break;
        continue;
      }
      if (nameToks.length < 2) continue;
      plausibleNameRows++;
      if (plausibleNameRows > students.length + 10) break;
    }

    const scores: Partial<Record<ExcelGradeKey, number>> = {};
    for (const key of EXAM_KEYS) {
      const col = scoreCols[key];
      if (col === undefined || col >= row.length) continue;
      const score = parseScore(row[col], maxScores[key], true);
      if (score !== null) scores[key] = score;
    }
    const firstScore = Object.values(scores)[0];
    if (firstScore === undefined) continue;

    const bestRow = findStudentMatch(nameCell, studentTokens, used);
    if (bestRow) {
      matches.push({ studentId: bestRow.id, studentName: bestRow.name, score: firstScore, scores });
      used.add(bestRow.id);
    } else if (nameCell) {
      unmatchedRows.push({ name: nameCell, score: firstScore });
    }
  }

  const missingStudents = students.filter((s) => !used.has(s.id));
  return { matches, unmatchedRows, missingStudents };
}
