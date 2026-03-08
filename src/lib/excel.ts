import { Student, Course } from "@/types/student";
import * as XLSX from "xlsx";

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
          const row = jsonData[i] as unknown[];
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
    const row: Record<string, unknown> = {
      "#": idx + 1,
      "اسم الطالب": s.name,
    };
    s.lectureBonus.forEach((b, i) => {
      row[`محاضرة ${i + 1}`] = b;
    });
    row["مجموع البونص"] = s.lectureBonus.reduce((a, b) => a + b, 0);
    row["اختبار أول"] = s.exam1;
    row["اختبار ثاني"] = s.exam2;
    row["نهائي"] = s.finalExam;
    row["مشاركة"] = s.participation;
    row["المجموع الكلي"] = getTotal(s);
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الدرجات");
  XLSX.writeFile(wb, `${course.name}_درجات.xlsx`);
}

export function getTotal(student: Student): number {
  const bonusTotal = student.lectureBonus.reduce((a, b) => a + b, 0);
  return bonusTotal + student.exam1 + student.exam2 + student.finalExam + student.participation;
}

export function createStudent(name: string, lectureCount: number): Student {
  return {
    id: crypto.randomUUID(),
    name,
    lectureBonus: new Array(lectureCount).fill(0),
    exam1: 0,
    exam2: 0,
    finalExam: 0,
    participation: 0,
  };
}
