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

export function parseExcelFile(file: File): Promise<string[]> {
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

        const seen = new Set<string>();
        const names: string[] = [];

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
          names.push(raw);
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

// --- PAAET (نظام الكلية) aggregate attendance import ---
// The PAAET "تقرير الطلبة المسجلين" export gives, per student, total
// present (حضور) and total absent (غياب) counts — not per-lecture detail.
// We match students by name and distribute the absences onto the LAST N
// lectures so the present/absent totals shown in GradeTrackPro match PAAET.

export interface PaaetImportResult {
  matched: { studentId: string; attendance: boolean[] }[];
  newStudents: { name: string; attendance: boolean[] }[];
  matchedCount: number;
  newCount: number;
}

function buildAttendanceFromAbsences(absentCount: number, lectureCount: number): boolean[] {
  const att = new Array(Math.max(0, lectureCount)).fill(true);
  const absent = Math.max(0, Math.min(absentCount, lectureCount));
  // mark the last `absent` lectures as absent
  for (let i = lectureCount - absent; i < lectureCount; i++) att[i] = false;
  return att;
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

        // locate the header row that contains both حضور and غياب columns
        let headerRowIdx = -1, presentCol = -1, absentCol = -1, nameCol = -1;
        for (let r = 0; r < rows.length; r++) {
          const cells = rows[r].map((c) => String(c ?? "").trim());
          const pi = cells.findIndex((c) => c === "حضور" || c.toLowerCase() === "present");
          const ai = cells.findIndex((c) => c === "غياب" || c.toLowerCase() === "absent");
          if (pi !== -1 && ai !== -1) {
            headerRowIdx = r; presentCol = pi; absentCol = ai;
            nameCol = cells.findIndex((c) =>
              ["اسم الطالب", "الاسم", "اسم", "الطالب", "الطالبة", "name", "student"].includes(c.toLowerCase())
            );
            break;
          }
        }

        // not a PAAET-format file
        if (headerRowIdx === -1) {
          resolve({ matched: [], newStudents: [], matchedCount: 0, newCount: 0 });
          return;
        }

        const lectureCount = course.lectureCount || course.lectures.length || 0;
        const matched: PaaetImportResult["matched"] = [];
        const newStudents: PaaetImportResult["newStudents"] = [];
        const usedStudentIds = new Set<string>();

        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          const name = nameCol >= 0 ? String(row[nameCol] ?? "").trim() : "";
          if (!name || /^\d+$/.test(name)) continue;

          const absentRaw = Number(String(row[absentCol] ?? "").trim());
          const absentCount = Number.isFinite(absentRaw) ? absentRaw : 0;
          const attendance = buildAttendanceFromAbsences(absentCount, lectureCount);

          // match by name (exact first, then contains) — skip already-matched
          const student = course.students.find(
            (s) =>
              !usedStudentIds.has(s.id) &&
              (s.name.trim() === name ||
                s.name.trim().includes(name) ||
                name.includes(s.name.trim()))
          );

          if (student) {
            usedStudentIds.add(student.id);
            matched.push({ studentId: student.id, attendance });
          } else {
            newStudents.push({ name, attendance });
          }
        }

        resolve({
          matched,
          newStudents,
          matchedCount: matched.length,
          newCount: newStudents.length,
        });
      } catch {
        reject(new Error("فشل في قراءة ملف الحضور"));
      }
    };
    reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
    reader.readAsArrayBuffer(file);
  });
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
