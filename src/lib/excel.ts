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

function parseAttendanceValue(v: unknown): boolean | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["حاضر", "حضر", "ح", "1", "p", "present", "true", "✓", "yes", "نعم"].includes(s)) return true;
  if (["غائب", "غاب", "غ", "0", "a", "absent", "false", "✗", "no", "لا"].includes(s)) return false;
  return null;
}

export interface AttendanceImportResult {
  updates: { studentId: string; lectureIndex: number; present: boolean }[];
  matched: number;
  unmatched: string[];
}

export function parseAttendanceFile(
  file: File,
  course: Course,
): Promise<AttendanceImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][];

        if (rows.length < 2) { resolve({ updates: [], matched: 0, unmatched: [] }); return; }

        const headerRow = rows[0].map((c) => String(c ?? "").trim());
        // detect lecture columns: any column after "اسم الطالب" (or index >=1 ignoring #)
        const nameColIdx = headerRow.findIndex((h) =>
          ["اسم الطالب", "الاسم", "name", "student"].includes(h.toLowerCase())
        );
        const nameIdx = nameColIdx >= 0 ? nameColIdx : 1;

        // map header index → lecture index in course
        const colToLecture: Record<number, number> = {};
        headerRow.forEach((h, ci) => {
          if (ci <= nameIdx) return;
          // match by م1 prefix or date label
          course.lectures.forEach((l, li) => {
            if (h.includes(l.label) || h.includes(`م${li + 1}`) || h === String(li + 1)) {
              colToLecture[ci] = li;
            }
          });
          // fallback: column position maps to lecture index
          if (colToLecture[ci] === undefined) {
            const li = ci - nameIdx - 1;
            if (li >= 0 && li < course.lectures.length) colToLecture[ci] = li;
          }
        });

        const updates: AttendanceImportResult["updates"] = [];
        const unmatched: string[] = [];

        for (let r = 1; r < rows.length; r++) {
          const row = rows[r];
          const rawName = String(row[nameIdx] ?? "").trim();
          if (!rawName) continue;

          const student = course.students.find(
            (s) => s.name.trim() === rawName || s.name.trim().includes(rawName) || rawName.includes(s.name.trim())
          );
          if (!student) { unmatched.push(rawName); continue; }

          Object.entries(colToLecture).forEach(([ci, li]) => {
            const val = parseAttendanceValue(row[Number(ci)]);
            if (val !== null) updates.push({ studentId: student.id, lectureIndex: li, present: val });
          });
        }

        resolve({ updates, matched: updates.length > 0 ? rows.length - 1 - unmatched.length : 0, unmatched });
      } catch {
        reject(new Error("فشل في قراءة ملف الحضور"));
      }
    };
    reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
    reader.readAsArrayBuffer(file);
  });
}

// --- PAAET (نظام الكلية) cumulative attendance import ---
// The college's "غياب" column is a running total of the student's absences
// in this course TO DATE — it never names which lecture date each absence
// falls on, and it keeps growing week over week rather than resetting per
// session. So a single import can't be read as "absent/present today" on
// its own: it only tells us the *delta* against the total we saw last
// time (stored per-student as paaetAbsenceCount). If the total grew since
// the last import, that growth is attributed to the ONE lecture the
// professor currently has open (lectureIndex) — the same lecture they'd be
// manually marking anyway — and the new total is stored as the fresh
// baseline for next time.
export interface PaaetImportResult {
  matched: { studentId: string; absentCount: number }[];
  newStudents: { name: string; absentCount: number }[];
  matchedCount: number;
  newCount: number;
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

// Groups a course's CURRENT roster by exact duplicate identity — same civil
// ID, or (when neither side has one) the exact same normalized name. This
// is intentionally stricter than studentsMatch's fuzzy substring fallback:
// grouping existing rows for deletion must never merge two different real
// students, so only an exact match counts. Each group is only the
// candidates for a cleanup review; nothing is deleted here.
export function findDuplicateGroups(students: Student[]): DuplicateGroup[] {
  const groups = new Map<string, Student[]>();
  for (const s of students) {
    const key = s.studentNumber ? `id:${s.studentNumber}` : `name:${normalizeName(s.name)}`;
    const arr = groups.get(key);
    if (arr) arr.push(s); else groups.set(key, [s]);
  }

  const result: DuplicateGroup[] = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => {
      const scoreDiff = studentRichness(b) - studentRichness(a);
      if (scoreDiff !== 0) return scoreDiff;
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });
    result.push({ key, students: sorted, keepId: sorted[0].id });
  }
  return result;
}

// Matches the college report's (name, cumulative-absence-count) rows against
// the course's current roster. Shared by both the Excel and PDF variants of
// the attendance-import parser below.
function matchPaaetEntries(
  entries: { name: string; absentCount: number }[],
  course: Course,
): PaaetImportResult {
  const matched: PaaetImportResult["matched"] = [];
  const newStudents: PaaetImportResult["newStudents"] = [];
  const usedStudentIds = new Set<string>();

  for (const { name, absentCount } of entries) {
    const normName = normalizeName(name);
    const student = course.students.find((s) => {
      if (usedStudentIds.has(s.id)) return false;
      const normStudent = normalizeName(s.name);
      return normStudent === normName || normStudent.includes(normName) || normName.includes(normStudent);
    });

    if (student) {
      usedStudentIds.add(student.id);
      matched.push({ studentId: student.id, absentCount });
    } else {
      newStudents.push({ name, absentCount });
    }
  }

  return { matched, newStudents, matchedCount: matched.length, newCount: newStudents.length };
}

export function parsePaaetAttendanceFile(
  file: File,
  course: Course,
): Promise<PaaetImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];

        let headerRowIdx = -1, absentCol = -1, nameCol = -1;
        for (let r = 0; r < rows.length; r++) {
          const cells = rows[r].map((c) => String(c ?? "").trim());
          const pi = cells.findIndex((c) => c === "حضور" || c.toLowerCase() === "present");
          const ai = cells.findIndex((c) => c === "غياب" || c.toLowerCase() === "absent");
          if (pi !== -1 && ai !== -1) {
            headerRowIdx = r; absentCol = ai;
            nameCol = cells.findIndex((c) =>
              ["اسم الطالب", "الاسم", "اسم", "الطالب", "الطالبة", "name", "student"].includes(c.toLowerCase())
            );
            break;
          }
        }

        if (headerRowIdx === -1) {
          resolve({ matched: [], newStudents: [], matchedCount: 0, newCount: 0 });
          return;
        }

        const entries: { name: string; absentCount: number }[] = [];
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          const name = nameCol >= 0 ? String(row[nameCol] ?? "").trim() : "";
          if (!name || /^\d+$/.test(name)) continue;

          const absentRaw = Number(String(row[absentCol] ?? "").trim());
          entries.push({ name, absentCount: Number.isFinite(absentRaw) ? absentRaw : 0 });
        }

        resolve(matchPaaetEntries(entries, course));
      } catch {
        reject(new Error("فشل في قراءة ملف الحضور"));
      }
    };
    reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
    reader.readAsArrayBuffer(file);
  });
}

// Parses the college system's per-lecture attendance report ("كشف الطلبة")
// in PDF form. Table rows carry a sequence number, the Arabic name (split
// across several items), an email ending in "@paaet.edu.kw", a حضور (present)
// count, then a غياب (absent) count — reconstructed from pdf.js's raw text
// items the same way as the roster PDF (see extractPdfRows / parseRosterPdf).
// The absence count is this student's running total for the course so far,
// not a per-session flag — matchPaaetEntries/the caller treat it the same
// way as the Excel variant's absentCount.
export async function parsePaaetAttendancePdf(
  file: File,
  course: Course,
): Promise<PaaetImportResult> {
  const { extractPdfRows } = await import("@/lib/pdfTable");
  const rows = await extractPdfRows(file);

  const normDigits = (v: string) => v.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  const entries: { name: string; absentCount: number }[] = [];
  for (const row of rows) {
    if (row.length < 4) continue;
    const first = normDigits(row[0].str);
    if (!/^\d{1,3}$/.test(first)) continue;

    const emailIdx = row.findIndex((it) => it.str.includes("@"));
    if (emailIdx < 1 || emailIdx > row.length - 3) continue;

    const present = normDigits(row[emailIdx + 1]?.str || "");
    const absent = normDigits(row[emailIdx + 2]?.str || "");
    if (!/^\d+$/.test(present) || !/^\d+$/.test(absent)) continue;

    const name = row.slice(1, emailIdx).map((it) => it.str).join(" ").trim();
    if (!name) continue;

    entries.push({ name, absentCount: Number(absent) });
  }

  return matchPaaetEntries(entries, course);
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
