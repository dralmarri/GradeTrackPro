import { Student, Course } from "@/types/student";
import * as XLSX from "xlsx";

export function getBonusTotal(student: Student, maxBonus?: number): number {
  const rawTotal = student.lectureBonus.reduce((a, b) => a + b, 0);
  return typeof maxBonus === "number" ? Math.min(rawTotal, maxBonus) : rawTotal;
}

export function getMaxTotal(course: Pick<Course, "maxExam1" | "maxExam2" | "maxFinal" | "maxParticipation" | "maxHomework" | "maxBonus">): number {
  return course.maxExam1 + course.maxExam2 + course.maxFinal + course.maxParticipation + (course.maxHomework || 0);
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
  const data = course.students.map((s, idx) => {
    const bonusTotal = s.lectureBonus.reduce((a, b) => a + b, 0);
    return {
      "#": idx + 1,
      "اسم الطالب": s.name,
      "مجموع البونص": Math.min(bonusTotal, course.maxBonus),
      "اختبار أول": s.exam1,
      "اختبار ثاني": s.exam2,
      "نهائي": s.finalExam,
      "مشاركة": s.participation,
      "واجب": s.homework,
      "المجموع الكلي": getTotal(s, course),
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "النتائج");
  
  const fileName = `${course.name}_نتائج.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const file = new File([blob], fileName, { type: blob.type });

  // Try Web Share API first (works well on mobile)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: fileName }).catch(() => {
      // Fallback to download if share is cancelled
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

export function getTotal(student: Student, course?: Pick<Course, "maxBonus" | "maxExam1" | "maxExam2" | "maxFinal" | "maxParticipation" | "maxHomework">): number {
  const bonusTotal = getBonusTotal(student, course?.maxBonus);
  const base = student.exam1 + student.exam2 + student.finalExam + student.participation + (student.homework || 0);
  if (course && "maxExam1" in course) {
    const maxTotal = getMaxTotal(course);
    return Math.min(maxTotal, base + bonusTotal);
  }
  return base + bonusTotal;
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
  };
}
