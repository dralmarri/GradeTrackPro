import { useState, useCallback } from "react";
import { Course, Student, LectureInfo } from "@/types/student";
import { createStudent } from "@/lib/excel";

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

  const addCourse = useCallback((name: string, lectures: LectureInfo[]) => {
    const course: Course = {
      id: crypto.randomUUID(),
      name,
      students: [],
      lectureCount: lectures.length,
      lectures,
      maxBonus: 3,
      maxExam1: 20,
      maxExam2: 20,
      maxFinal: 40,
      maxParticipation: 10,
    };
    updateCourses((prev) => [...prev, course]);
    return course.id;
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

  const addLecture = useCallback((courseId: string, label?: string) => {
    updateCourses((prev) =>
      prev.map((c) => {
        if (c.id !== courseId) return c;
        return {
          ...c,
          lectureCount: c.lectureCount + 1,
          lectures: [...c.lectures, { date: new Date().toISOString(), label: label || `محاضرة ${c.lectureCount + 1}` }],
          students: c.students.map((s) => ({
            ...s,
            lectureBonus: [...s.lectureBonus, 0],
          })),
        };
      })
    );
  }, [updateCourses]);

  return {
    courses,
    addCourse,
    addStudentsToCourse,
    updateStudent,
    updateLectureBonus,
    deleteCourse,
    deleteStudent,
    addLecture,
  };
}
