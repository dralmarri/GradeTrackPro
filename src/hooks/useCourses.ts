import { useState, useCallback, useEffect } from "react";
import { Course, Student, LectureInfo } from "@/types/student";
import { createStudent } from "@/lib/excel";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Convert DB row to Course type (without students)
function dbRowToCourse(row: any): Omit<Course, "students"> {
  return {
    id: row.id,
    name: row.name,
    section: row.section || "",
    lectureCount: row.lecture_count || 0,
    lectures: (row.lectures || []) as LectureInfo[],
    maxBonus: Number(row.max_bonus) || 3,
    maxExam1: Number(row.max_exam1) || 20,
    maxExam2: Number(row.max_exam2) || 20,
    maxFinal: Number(row.max_final) || 40,
    maxParticipation: Number(row.max_participation) || 10,
    lectureDays: (row.lecture_days || []) as number[],
    lectureTime: row.lecture_time || "",
    semesterStart: row.semester_start || "",
    semesterEnd: row.semester_end || "",
  };
}

function dbRowToStudent(row: any): Student {
  return {
    id: row.id,
    name: row.name,
    lectureBonus: (row.lecture_bonus || []) as number[],
    attendance: (row.attendance || []) as boolean[],
    exam1: Number(row.exam1) || 0,
    exam2: Number(row.exam2) || 0,
    finalExam: Number(row.final_exam) || 0,
    participation: Number(row.participation) || 0,
  };
}

export function useCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all courses with students
  const fetchCourses = useCallback(async () => {
    if (!user) { setCourses([]); setLoading(false); return; }
    
    const { data: courseRows, error: cErr } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: true });

    if (cErr) { console.error("Error fetching courses:", cErr); setLoading(false); return; }

    const { data: studentRows, error: sErr } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: true });

    if (sErr) { console.error("Error fetching students:", sErr); setLoading(false); return; }

    const coursesWithStudents: Course[] = (courseRows || []).map((cr) => {
      const courseStudents = (studentRows || [])
        .filter((sr) => sr.course_id === cr.id)
        .map(dbRowToStudent);
      return { ...dbRowToCourse(cr), students: courseStudents };
    });

    setCourses(coursesWithStudents);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const addCourse = useCallback(async (
    name: string,
    lectures: LectureInfo[],
    section?: string,
    schedule?: { lectureDays: number[]; lectureTime: string; semesterStart: string; semesterEnd: string }
  ): Promise<string> => {
    if (!user) return "";

    const { data, error } = await supabase
      .from("courses")
      .insert({
        user_id: user.id,
        name,
        section: section || "",
        lecture_count: lectures.length,
        lectures: lectures as any,
        max_bonus: 3,
        max_exam1: 20,
        max_exam2: 20,
        max_final: 40,
        max_participation: 10,
        lecture_days: (schedule?.lectureDays || []) as any,
        lecture_time: schedule?.lectureTime || "",
        semester_start: schedule?.semesterStart || "",
        semester_end: schedule?.semesterEnd || "",
      })
      .select()
      .single();

    if (error) { console.error("Error adding course:", error); return ""; }
    await fetchCourses();
    return data.id;
  }, [user, fetchCourses]);

  const updateCourse = useCallback(async (courseId: string, updates: Partial<Omit<Course, "id" | "students">>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.section !== undefined) dbUpdates.section = updates.section;
    if (updates.lectureCount !== undefined) dbUpdates.lecture_count = updates.lectureCount;
    if (updates.lectures !== undefined) dbUpdates.lectures = updates.lectures;
    if (updates.maxBonus !== undefined) dbUpdates.max_bonus = updates.maxBonus;
    if (updates.maxExam1 !== undefined) dbUpdates.max_exam1 = updates.maxExam1;
    if (updates.maxExam2 !== undefined) dbUpdates.max_exam2 = updates.maxExam2;
    if (updates.maxFinal !== undefined) dbUpdates.max_final = updates.maxFinal;
    if (updates.maxParticipation !== undefined) dbUpdates.max_participation = updates.maxParticipation;
    if (updates.lectureDays !== undefined) dbUpdates.lecture_days = updates.lectureDays;
    if (updates.lectureTime !== undefined) dbUpdates.lecture_time = updates.lectureTime;
    if (updates.semesterStart !== undefined) dbUpdates.semester_start = updates.semesterStart;
    if (updates.semesterEnd !== undefined) dbUpdates.semester_end = updates.semesterEnd;

    const { error } = await supabase.from("courses").update(dbUpdates).eq("id", courseId);
    if (error) console.error("Error updating course:", error);
    else await fetchCourses();
  }, [fetchCourses]);

  const addStudentsToCourse = useCallback(async (courseId: string, names: string[]) => {
    if (!user) return;
    const course = courses.find((c) => c.id === courseId);
    const lectureCount = course?.lectureCount || 0;

    const rows = names.map((name) => ({
      course_id: courseId,
      user_id: user.id,
      name,
      lecture_bonus: new Array(lectureCount).fill(0),
      attendance: new Array(lectureCount).fill(true),
      exam1: 0, exam2: 0, final_exam: 0, participation: 0,
    }));

    const { error } = await supabase.from("students").insert(rows);
    if (error) console.error("Error adding students:", error);
    else await fetchCourses();
  }, [user, courses, fetchCourses]);

  const updateStudent = useCallback(async (courseId: string, studentId: string, updates: Partial<Student>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.lectureBonus !== undefined) dbUpdates.lecture_bonus = updates.lectureBonus;
    if (updates.attendance !== undefined) dbUpdates.attendance = updates.attendance;
    if (updates.exam1 !== undefined) dbUpdates.exam1 = updates.exam1;
    if (updates.exam2 !== undefined) dbUpdates.exam2 = updates.exam2;
    if (updates.finalExam !== undefined) dbUpdates.final_exam = updates.finalExam;
    if (updates.participation !== undefined) dbUpdates.participation = updates.participation;

    const { error } = await supabase.from("students").update(dbUpdates).eq("id", studentId);
    if (error) console.error("Error updating student:", error);
    else await fetchCourses();
  }, [fetchCourses]);

  const updateLectureBonus = useCallback(
    async (courseId: string, studentId: string, lectureIndex: number, value: number) => {
      const course = courses.find((c) => c.id === courseId);
      const student = course?.students.find((s) => s.id === studentId);
      if (!student) return;

      const newBonus = [...student.lectureBonus];
      newBonus[lectureIndex] = value;

      const { error } = await supabase.from("students").update({ lecture_bonus: newBonus }).eq("id", studentId);
      if (error) console.error("Error updating bonus:", error);
      else await fetchCourses();
    },
    [courses, fetchCourses]
  );

  const updateAttendance = useCallback(
    async (courseId: string, studentId: string, lectureIndex: number, present: boolean) => {
      const course = courses.find((c) => c.id === courseId);
      const student = course?.students.find((s) => s.id === studentId);
      if (!student) return;

      const newAttendance = [...(student.attendance || new Array(course!.lectureCount).fill(true))];
      newAttendance[lectureIndex] = present;

      const { error } = await supabase.from("students").update({ attendance: newAttendance }).eq("id", studentId);
      if (error) console.error("Error updating attendance:", error);
      else await fetchCourses();
    },
    [courses, fetchCourses]
  );

  const deleteCourse = useCallback(async (courseId: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", courseId);
    if (error) console.error("Error deleting course:", error);
    else await fetchCourses();
  }, [fetchCourses]);

  const deleteStudent = useCallback(async (courseId: string, studentId: string) => {
    const { error } = await supabase.from("students").delete().eq("id", studentId);
    if (error) console.error("Error deleting student:", error);
    else await fetchCourses();
  }, [fetchCourses]);

  const addLecture = useCallback(async (courseId: string) => {
    const DAYS_AR: Record<number, string> = {
      0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء",
      4: "الخميس", 5: "الجمعة", 6: "السبت",
    };
    const now = new Date();
    const dayName = DAYS_AR[now.getDay()];
    const dateStr = format(now, "MM/dd");
    const label = `${dayName} ${dateStr}`;

    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    // Update course
    const { error: cErr } = await supabase.from("courses").update({
      lecture_count: course.lectureCount + 1,
      lectures: [...course.lectures, { date: now.toISOString(), label }],
    }).eq("id", courseId);
    if (cErr) { console.error("Error adding lecture:", cErr); return; }

    // Update all students in this course
    for (const student of course.students) {
      await supabase.from("students").update({
        lecture_bonus: [...student.lectureBonus, 0],
        attendance: [...(student.attendance || []), true],
      }).eq("id", student.id);
    }

    await fetchCourses();
  }, [courses, fetchCourses]);

  const deleteAllData = useCallback(async () => {
    if (!user) return;
    // Deleting courses will cascade delete students
    const { error } = await supabase.from("courses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.error("Error deleting all:", error);
    else await fetchCourses();
  }, [user, fetchCourses]);

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

  const importAllData = useCallback(async (file: File): Promise<void> => {
    if (!user) return;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as Course[];
          
          // Delete existing data first
          await supabase.from("courses").delete().neq("id", "00000000-0000-0000-0000-000000000000");

          // Insert courses and students
          for (const course of imported) {
            const { data: newCourse, error: cErr } = await supabase
              .from("courses")
              .insert({
                user_id: user.id,
                name: course.name,
                section: course.section || "",
                lecture_count: course.lectureCount,
                lectures: course.lectures as any,
                max_bonus: course.maxBonus,
                max_exam1: course.maxExam1,
                max_exam2: course.maxExam2,
                max_final: course.maxFinal,
                max_participation: course.maxParticipation,
                lecture_days: (course.lectureDays || []) as any,
                lecture_time: course.lectureTime || "",
                semester_start: course.semesterStart || "",
                semester_end: course.semesterEnd || "",
              })
              .select()
              .single();

            if (cErr || !newCourse) continue;

            if (course.students.length > 0) {
              const studentRows = course.students.map((s) => ({
                course_id: newCourse.id,
                user_id: user.id,
                name: s.name,
                lecture_bonus: s.lectureBonus,
                attendance: s.attendance,
                exam1: s.exam1,
                exam2: s.exam2,
                final_exam: s.finalExam,
                participation: s.participation,
              }));
              await supabase.from("students").insert(studentRows);
            }
          }

          await fetchCourses();
          resolve();
        } catch {
          reject(new Error("فشل في قراءة ملف النسخة الاحتياطية"));
        }
      };
      reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
      reader.readAsText(file);
    });
  }, [user, fetchCourses]);

  return {
    courses,
    loading,
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
