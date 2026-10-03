import { Student, Course } from "@/types/student";
import * as XLSX from "xlsx";

export function getBonusTotal(student: Student, maxBonus?: number): number {
  const rawTotal = student.lectureBonus.reduce((a, b) => a + b, 0);
  return typeof maxBonus === "number" ? Math.min(rawTotal, maxBonus) : rawTotal;
}

export function getCustomTotal(student: Student, course: Pick<Course, "customComponents">): number {
  const comps = course.customComponents || [];
  return comps.reduce((sum, c) => {
    const raw = Number(student.customScores?.[c.key] || 0);
    return sum + Math.max(0, Math.min(raw, c.max));
  }, 0);
}

export function getCustomMaxTotal(course: Pick<Course, "customComponents">): number {
  return (course.customComponents || []).reduce((s, c) => s + (Number(c.max) || 0), 0);
}

export function getMaxTotal(course: Pick<Course, "maxExam1" | "maxExam2" | "maxFinal" | "maxParticipation" | "maxHomework" | "maxBonus" | "bonusEnabled" | "customComponents" | "hiddenComponents">): number {
  const hidden = new Set((course as any).hiddenComponents || []);
  let base = 0;
  if (!hidden.has("exam1")) base += course.maxExam1;
  if (!hidden.has("exam2")) base += course.maxExam2;
  if (!hidden.has("finalExam")) base += course.maxFinal;
  if (!hidden.has("participation")) base += course.maxParticipation;
  if (!hidden.has("homework")) base += (course.maxHomework || 0);
  const customMax = getCustomMaxTotal(course as Course);
  return base + customMax;
}

export function getPercentage(total: number, maxTotal: number): number {
  if (!Number.isFinite(total) || !Number.isFinite(maxTotal) || maxTotal <= 0) return 0;
  return Math.max(0, Math.min(100, (total / maxTotal) * 100));
}

export interface ImportedStudent { name: string; civilId?: string }

export function parseExcelFile(file: File): Promise<ImportedStudent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "" }) as string[][];

        if (!rows.length) { resolve([]); return; }

        const HEADER_SKIP = new Set([
          "الاسم", "اسم الطالب", "اسم", "الطالب", "الطالبة",
          "name", "student", "#", "م", "الرقم", "رقم",
        ]);

        // detect name column: prefer header keyword match, otherwise pick column
        // with most 3-part Arabic names (≥3 tokens) to avoid headers/titles
        const arabicTokenCount = (v: string) => {
          const s = String(v ?? "").trim();
          if (!s || /^\d+$/.test(s)) return 0;
          if (s.length < 4) return 0;
          return s.split(/\s+/).filter((t) => /[؀-ۿ]/.test(t)).length;
        };
        const isArabicName = (v: string) => arabicTokenCount(v) >= 2;
        const isThreePartName = (v: string) => arabicTokenCount(v) >= 3;

        const colCount = Math.max(...rows.map((r) => r.length));
        let nameColIdx = -1;

        // 1. look for a header row in first 5 rows
        for (let r = 0; r < Math.min(5, rows.length) && nameColIdx === -1; r++) {
          for (let c = 0; c < rows[r].length; c++) {
            const cell = String(rows[r][c] ?? "").trim().toLowerCase();
            if (["الاسم", "اسم الطالب", "اسم", "الطالب", "الطالبة", "name", "student"].includes(cell)) {
              nameColIdx = c;
              break;
            }
          }
        }

        // 2. fallback: prefer column with most 3-part names, else most 2-part names
        if (nameColIdx === -1) {
          let bestThree = 0, bestTwo = 0, bestThreeCol = -1, bestTwoCol = -1;
          for (let c = 0; c < colCount; c++) {
            const threeCount = rows.filter((r) => isThreePartName(String(r[c] ?? ""))).length;
            const twoCount = rows.filter((r) => isArabicName(String(r[c] ?? ""))).length;
            if (threeCount > bestThree) { bestThree = threeCount; bestThreeCol = c; }
            if (twoCount > bestTwo) { bestTwo = twoCount; bestTwoCol = c; }
          }
          // prefer 3-part column if it has at least 2 such names, otherwise fall back to 2-part
          nameColIdx = (bestThree >= 2) ? bestThreeCol : bestTwoCol;
        }

        if (nameColIdx === -1) { resolve([]); return; }

        // civil-ID column: header keyword first, else the column where most
        // cells are long digit runs (7-14 digits — serial numbers are short)
        const normDigits = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\s/g, "");
        const isCivil = (v: string) => /^\d{7,14}$/.test(normDigits(String(v ?? "").trim()));
        let civilColIdx = -1;
        for (let r = 0; r < Math.min(5, rows.length) && civilColIdx === -1; r++) {
          for (let c = 0; c < rows[r].length; c++) {
            const cell = String(rows[r][c] ?? "").trim().toLowerCase();
            if (["الرقم المدني", "رقم مدني", "الرقم المدنى", "civil id", "civil", "المدني"].includes(cell)) {
              civilColIdx = c; break;
            }
          }
        }
        if (civilColIdx === -1) {
          let best = 0;
          for (let c = 0; c < colCount; c++) {
            if (c === nameColIdx) continue;
            const count = rows.filter((r) => isCivil(String(r[c] ?? ""))).length;
            if (count > best) { best = count; civilColIdx = c; }
          }
          if (best < 2) civilColIdx = -1; // not confident it's a civil-ID column
        }

        const seen = new Set<string>();
        const names: ImportedStudent[] = [];

        // check if column has any 3-part names; if so, require ≥3 parts to filter noise
        const threePartCount = rows.filter((r) => isThreePartName(String(r[nameColIdx] ?? ""))).length;
        const minParts = threePartCount >= 2 ? 3 : 2;

        for (const row of rows) {
          const raw = String(row[nameColIdx] ?? "").trim();
          if (!raw) continue;
          const lower = raw.toLowerCase();
          if (HEADER_SKIP.has(lower)) continue;
          if (/^\d+$/.test(raw)) continue;           // skip pure numbers (civil IDs)
          if (raw.length < 4) continue;
          if (arabicTokenCount(raw) < minParts) continue;  // require enough name parts
          if (seen.has(raw)) continue;               // deduplicate
          seen.add(raw);
          const civilRaw = civilColIdx >= 0 ? String(row[civilColIdx] ?? "").trim() : "";
          const civilId = isCivil(civilRaw) ? normDigits(civilRaw) : undefined;
          names.push({ name: raw, civilId });
        }

        resolve(names);
      } catch {
        reject(new Error("فشل في قراءة ملف Excel"));
      }
    };
    reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
    reader.readAsArrayBuffer(file);
  });
}

// Parses the college system's "قوائم المسجلين بالشعب" roster PDF export.
// Its table rows carry a sequence number, a 9-12 digit student ID, the
// Arabic name, a specialization word, and an optional note — reconstructed
// from pdf.js's raw text items (see extractPdfRows) since the PDF stores
// them in column-clustered order, not left-to-right reading order. Rather
// than relying on fixed column X-ranges (fragile across page sizes), each
// row is matched by VALUE: a short standalone number becomes the row's
// sequence number (م) — required so the single header line that also
// happens to carry the course instructor's name and a stray ID number
// isn't mistaken for a student row — the longer digit run becomes the
// student ID, and the row's longest multi-word Arabic text becomes the name.
export async function parseRosterPdf(file: File): Promise<ImportedStudent[]> {
  const { extractPdfRows } = await import("@/lib/pdfTable");
  const rows = await extractPdfRows(file);

  const normDigits = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const arabicTokenCount = (v: string) => v.split(/\s+/).filter((t) => /[؀-ۿ]/.test(t)).length;

  const seen = new Set<string>();
  const names: ImportedStudent[] = [];

  for (const row of rows) {
    let civilId: string | undefined;
    let name = "";
    let hasSeqNum = false;
    for (const item of row) {
      const digits = normDigits(item.str);
      if (/^\d{1,3}$/.test(digits)) { hasSeqNum = true; continue; }
      if (/^\d{7,14}$/.test(digits)) { civilId = digits; continue; }
      if (arabicTokenCount(item.str) >= 2 && item.str.length > name.length) name = item.str;
    }
    if (!name || !civilId || !hasSeqNum || seen.has(name)) continue;
    seen.add(name);
    names.push({ name, civilId });
  }

  return names;
}

export function exportToExcel(course: Course) {
  const bonusOn = course.bonusEnabled !== false;
  const customs = course.customComponents || [];
  const hidden = new Set(course.hiddenComponents || []);
  const data = course.students.map((s, idx) => {
    const row: Record<string, any> = {
      "#": idx + 1,
      "اسم الطالب": s.name,
    };
    if (!hidden.has("exam1")) row["اختبار أول"] = s.exam1;
    if (!hidden.has("exam2")) row["اختبار ثاني"] = s.exam2;
    if (!hidden.has("finalExam")) row["نهائي"] = s.finalExam;
    if (!hidden.has("participation")) row["مشاركة"] = s.participation;
    if (!hidden.has("homework")) row["واجب"] = s.homework;
    for (const c of customs) {
      row[c.label] = Math.max(0, Math.min(Number(s.customScores?.[c.key] || 0), c.max));
    }
    if (bonusOn) {
      const bonusTotal = s.lectureBonus.reduce((a, b) => a + b, 0);
      row["مجموع البونص"] = Math.min(bonusTotal, course.maxBonus);
    }
    row["المجموع الكلي"] = getTotal(s, course);
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "النتائج");

  const fileName = `${course.name}_نتائج.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const file = new File([blob], fileName, { type: blob.type });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: fileName }).catch(() => {
      downloadBlob(blob, fileName);
    });
  } else {
    downloadBlob(blob, fileName);
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getTotal(student: Student, course?: Partial<Pick<Course, "maxBonus" | "maxExam1" | "maxExam2" | "maxFinal" | "maxParticipation" | "maxHomework" | "bonusEnabled" | "customComponents" | "hiddenComponents">>): number {
  const bonusOn = course ? course.bonusEnabled !== false : true;
  const bonusTotal = bonusOn ? getBonusTotal(student, course?.maxBonus) : 0;
  const hidden = new Set((course as any)?.hiddenComponents || []);
  let base = 0;
  if (!hidden.has("exam1")) base += student.exam1;
  if (!hidden.has("exam2")) base += student.exam2;
  if (!hidden.has("finalExam")) base += student.finalExam;
  if (!hidden.has("participation")) base += student.participation;
  if (!hidden.has("homework")) base += (student.homework || 0);
  const customSum = course ? getCustomTotal(student, course as Course) : 0;
  if (course && course.maxExam1 !== undefined) {
    const maxTotal = getMaxTotal(course as Course);
    return Math.min(maxTotal + (bonusOn ? (course.maxBonus || 0) : 0), base + customSum + bonusTotal);
  }
  return base + customSum + bonusTotal;
}

// --- Attendance import/export ---

export function exportAttendanceTemplate(course: Course) {
  const header: Record<string, unknown> = { "#": "#", "اسم الطالب": "اسم الطالب" };
  course.lectures.forEach((l, i) => { header[`م${i + 1} (${l.label})`] = `م${i + 1} (${l.label})`; });

  const rows = course.students.map((s, idx) => {
    const row: Record<string, unknown> = { "#": idx + 1, "اسم الطالب": s.name };
    course.lectures.forEach((l, i) => {
      row[`م${i + 1} (${l.label})`] = s.attendance[i] !== false ? "حاضر" : "غائب";
    });
    return row;
  });

  const ws = XLSX.utils.json_to_sheet([header, ...rows], { skipHeader: true });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الحضور");
  const fileName = `${course.name}_حضور_قالب.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: fileName }).catch(() => downloadBlob(blob, fileName));
  } else {
    downloadBlob(blob, fileName);
  }
}

// Loose match for names coming from the college's own export — normalizes
// Unicode form (NFKC: copy-pasting from a PDF vs. typing directly can
// produce visually-identical Arabic text using different underlying code
// points, which breaks plain string equality even after trimming), strips
// invisible bidi/zero-width marks some sources insert around Arabic text,
// collapses whitespace, and strips Arabic diacritics/tatweel — so a purely
// cosmetic difference never causes a real match to be missed (and, worse,
// a duplicate student to be created).
export function normalizeName(n: string): string {
  return n
    .normalize("NFKC")
    .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "");
}

// Matches a roster entry against a stored student. Prefers the civil
// ID/student number when both sides have one \u2014 it's an exact identifier, so
// it catches a real match even when the two names were entered through
// different sources and happen to normalize differently (and conversely,
// never falsely matches two different students who happen to share a
// normalized name). Falls back to the fuzzy name match otherwise.
export function studentsMatch(
  a: { name: string; civilId?: string },
  b: { name: string; civilId?: string },
): boolean {
  if (a.civilId && b.civilId) return a.civilId === b.civilId;
  const na = normalizeName(a.name);
  const nb = normalizeName(b.name);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export interface DuplicateGroup {
  key: string;
  students: Student[];
  keepId: string;
}

// How "filled in" a student's record is — used to pick which of several
// duplicate rows to keep when cleaning up a roster. Higher is more likely
// to be the row someone actually recorded real data against, rather than a
// stray re-import that only ever got the roster defaults.
function studentRichness(s: Student): number {
  let score = 0;
  score += s.attendance?.filter((a) => a === false).length || 0;
  score += s.lectureBonus?.filter((b) => b).length || 0;
  if ((s.exam1 || 0) + (s.exam2 || 0) + (s.finalExam || 0) + (s.participation || 0) + (s.homework || 0) > 0) score += 5;
  if (s.customScores && Object.keys(s.customScores).length > 0) score += 2;
  if (s.studentNumber) score += 1;
  score += s.lectureNotes?.filter((n) => n).length || 0;
  return score;
}

// Groups a course's CURRENT roster by the same studentsMatch logic used
// everywhere else (civil ID when both sides have one, otherwise the fuzzy
// substring name match) — names re-imported from a different source
// (Excel vs. PDF, or a slightly different college export) can end up as
// different text even after normalizeName, so an exact-only comparison
// here would silently miss real duplicates. Matching is transitive (union
// of every pairing that matches), since a chain of near-identical re-
// imports can drift name text a little further from the original each
// time. The fuzzy match can occasionally over-group (e.g. two different
// students sharing a short name as a substring of each other) — that's
// why nothing is deleted here; the caller always shows this as a review
// list the admin confirms by eye before anything is removed.
export function findDuplicateGroups(students: Student[]): DuplicateGroup[] {
  const n = students.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (studentsMatch(
        { name: students[i].name, civilId: students[i].studentNumber },
        { name: students[j].name, civilId: students[j].studentNumber },
      )) union(i, j);
    }
  }

  const byRoot = new Map<number, Student[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const arr = byRoot.get(r);
    if (arr) arr.push(students[i]); else byRoot.set(r, [students[i]]);
  }

  const result: DuplicateGroup[] = [];
  for (const group of byRoot.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => {
      const scoreDiff = studentRichness(b) - studentRichness(a);
      if (scoreDiff !== 0) return scoreDiff;
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
    result.push({ key: sorted[0].id, students: sorted, keepId: sorted[0].id });
  }
  return result;
}

export function createStudent(name: string, lectureCount: number): Student {
  return {
    id: crypto.randomUUID(),
    name,
    lectureBonus: new Array(lectureCount).fill(0),
    attendance: new Array(lectureCount).fill(true),
    exam1: 0,
    exam2: 0,
    finalExam: 0,
    participation: 0,
    homework: 0,
    customScores: {},
  };
}
