import { useState, useCallback } from "react";
import { Course, Student, LectureInfo } from "@/types/student";
import { createStudent } from "@/lib/excel";
import { format } from "date-fns";

const STORAGE_KEY = "student-grades-courses";

function loadCourses(): Course[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCourses(courses: Course[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>(loadCourses);

  const updateCourses = useCallback((updater: (prev: Course[]) => Course[]) => {
    setCourses((prev) => {
      const next = updater(prev);
      saveCourses(next);
      return next;
    });
  }, []);

  const addCourse = useCallback((
    name: string,
    lectures: LectureInfo[],
    section?: string,
    schedule?: { lectureDays: number[]; lectureTime: string; semesterStart: string; semesterEnd: string }
  ) => {
    const course: Course = {
      id: crypto.randomUUID(),
      name,
      section: section || "",
      students: [],
      lectureCount: lectures.length,
      lectures,
      maxBonus: 3,
      maxExam1: 20,
      maxExam2: 20,
      maxFinal: 40,
      maxParticipation: 10,
      lectureDays: schedule?.lectureDays || [],
      lectureTime: schedule?.lectureTime || "",
      semesterStart: schedule?.semesterStart || "",
      semesterEnd: schedule?.semesterEnd || "",
    };
    updateCourses((prev) => [...prev, course]);
    return course.id;
  }, [updateCourses]);

  const updateCourse = useCallback((courseId: string, updates: Partial<Omit<Course, "id" | "students">>) => {
    updateCourses((prev) =>
      prev.map((c) => (c.id === courseId ? { ...c, ...updates } : c))
    );
  }, [updateCourses]);

  const addStudentsToCourse = useCallback((courseId: string, names: string[]) => {
    updateCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        const newStudents = names.map((n) => createStudent(n, c.lectureCount));
        return { ...c, students: [...c.students, ...newStudents] };
      })
    );
  }, [updateCourses]);

  const updateStudent = useCallback((courseId: string, studentId: string, updates: Partial<Student>) => {
    updateCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          students: c.students.map((s) =>
            s.id === studentId ? { ...s, ...updates } : s
          ),
        };
      })
    );
  }, [updateCourses]);

  const updateLectureBonus = useCallback(
    (courseId: string, studentId: string, lectureIndex: number, value: number) => {
      updateCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            students: c.students.map((s) => {
              if (s.id !== studentId) return s;
              const newBonus = [...s.lectureBonus];
              newBonus[lectureIndex] = value;
              return { ...s, lectureBonus: newBonus };
            }),
          };
        })
      );
    },
    [updateCourses]
  );

  const updateAttendance = useCallback(
    (courseId: string, studentId: string, lectureIndex: number, present: boolean) => {
      updateCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            students: c.students.map((s) => {
              if (s.id !== studentId) return s;
              const newAttendance = [...(s.attendance || new Array(c.lectureCount).fill(true))];
              newAttendance[lectureIndex] = present;
              return { ...s, attendance: newAttendance };
            }),
          };
        })
      );
    },
    [updateCourses]
  );

  const deleteCourse = useCallback((courseId: string) => {
    updateCourses((prev) => prev.filter((c) => c.id !== courseId));
  }, [updateCourses]);

  const deleteStudent = useCallback((courseId: string, studentId: string) => {
    updateCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return { ...c, students: c.students.filter((s) => s.id !== studentId) };
      })
    );
  }, [updateCourses]);

  const addLecture = useCallback((courseId: string) => {
    const DAYS_AR: Record<number, string> = {
      0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء",
      4: "الخميس", 5: "الجمعة", 6: "السبت",
    };
    const now = new Date();
    const dayName = DAYS_AR[now.getDay()];
    const dateStr = format(now, "MM/dd");
    const label = `${dayName} ${dateStr}`;

    updateCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          lectureCount: c.lectureCount + 1,
          lectures: [...c.lectures, { date: now.toISOString(), label }],
          students: c.students.map((s) => ({
            ...s,
            lectureBonus: [...s.lectureBonus, 0],
            attendance: [...(s.attendance || []), true],
          })),
        };
      })
    );
  }, [updateCourses]);

  const deleteAllData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCourses([]);
  }, []);

  const exportAllData = useCallback(() => {
    const data = JSON.stringify(courses, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student-grades-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [courses]);

  const importAllData = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as Course[];
          saveCourses(data);
          setCourses(data);
          resolve();
        } catch {
          reject(new Error("فشل في قراءة ملف النسخة الاحتياطية"));
        }
      };
      reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
      reader.readAsText(file);
    });
  }, []);

  return {
    courses,
    addCourse,
    updateCourse,
    addStudentsToCourse,
    updateStudent,
    updateLectureBonus,
    updateAttendance,
    deleteCourse,
    deleteStudent,
    addLecture,
    deleteAllData,
    exportAllData,
    importAllData,
  };
}
