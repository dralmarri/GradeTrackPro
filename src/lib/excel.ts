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

export function getMaxTotal(course: Pick<Course, "maxExam1" | "maxExam2" | "maxFinal" | "maxParticipation" | "maxHomework" | "maxBonus" | "bonusEnabled" | "customComponents">): number {
  const base = course.maxExam1 + course.maxExam2 + course.maxFinal + course.maxParticipation + (course.maxHomework || 0);
  const customMax = getCustomMaxTotal(course as Course);
  // bonus historically wasn't part of max — kept identical so percentages stay consistent
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
  const data = course.students.map((s, idx) => {
    const row: Record<string, any> = {
      "#": idx + 1,
      "اسم الطالب": s.name,
      "اختبار أول": s.exam1,
      "اختبار ثاني": s.exam2,
      "نهائي": s.finalExam,
      "مشاركة": s.participation,
      "واجب": s.homework,
    };
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

export function getTotal(student: Student, course?: Partial<Pick<Course, "maxBonus" | "maxExam1" | "maxExam2" | "maxFinal" | "maxParticipation" | "maxHomework" | "bonusEnabled" | "customComponents">>): number {
  const bonusOn = course ? course.bonusEnabled !== false : true;
  const bonusTotal = bonusOn ? getBonusTotal(student, course?.maxBonus) : 0;
  const base = student.exam1 + student.exam2 + student.finalExam + student.participation + (student.homework || 0);
  const customSum = course ? getCustomTotal(student, course as Course) : 0;
  if (course && course.maxExam1 !== undefined) {
    const maxTotal = getMaxTotal(course as Course);
    return Math.min(maxTotal + (bonusOn ? (course.maxBonus || 0) : 0), base + customSum + bonusTotal);
  }
  return base + customSum + bonusTotal;
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
