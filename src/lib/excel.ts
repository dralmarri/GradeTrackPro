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
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { header: 1 });

        const names: string[] = [];
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown as unknown[];
          if (row && row.length > 0) {
            const name = String(row[0]).trim();
            if (name && name !== "الاسم" && name !== "اسم الطالب" && name !== "Name" && name !== "undefined") {
              names.push(name);
            }
          }
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
