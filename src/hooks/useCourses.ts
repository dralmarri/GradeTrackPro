import { useState, useCallback, useEffect } from "react";
import { Course, Student, LectureInfo, CustomComponent } from "@/types/student";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Use any-typed client to bypass empty generated types until tables are created
const db = supabase as any;

function dbRowToCourse(row: any): Omit<Course, "students"> {
  return {
    id: row.id,
    name: row.name,
    section: row.section || "",
    lectureCount: row.lecture_count || 0,
    lectures: (row.lectures || []) as LectureInfo[],
    maxBonus: row.max_bonus != null ? Number(row.max_bonus) : 3,
    maxExam1: row.max_exam1 != null ? Number(row.max_exam1) : 20,
    maxExam2: row.max_exam2 != null ? Number(row.max_exam2) : 20,
    maxFinal: row.max_final != null ? Number(row.max_final) : 40,
    maxParticipation: row.max_participation != null ? Number(row.max_participation) : 10,
    maxHomework: row.max_homework != null ? Number(row.max_homework) : 10,
    lectureDays: (row.lecture_days || []) as number[],
    lectureTime: row.lecture_time || "",
    semesterStart: row.semester_start || "",
    semesterEnd: row.semester_end || "",
    componentLabels: (row.component_labels || {}) as Course["componentLabels"],
    bonusEnabled: row.bonus_enabled !== false,
    customComponents: (row.custom_components || []) as CustomComponent[],
    hiddenComponents: (row.hidden_components || []) as any,
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
    homework: Number(row.homework) || 0,
    customScores: (row.custom_scores || {}) as Record<string, number>,
  };
}

export function useCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    if (!user) { setCourses([]); setLoading(false); return; }

    const { data: courseRows, error: cErr } = await db
      .from("courses").select("*").order("created_at", { ascending: true });
    if (cErr) { console.error("Error fetching courses:", cErr); setLoading(false); return; }

    const { data: studentRows, error: sErr } = await db
      .from("students").select("*").order("name", { ascending: true });
    if (sErr) { console.error("Error fetching students:", sErr); setLoading(false); return; }

    const coursesWithStudents: Course[] = (courseRows || []).map((cr: any) => {
      const courseStudents = (studentRows || [])
        .filter((sr: any) => sr.course_id === cr.id)
        .map(dbRowToStudent);
      return { ...dbRowToCourse(cr), students: courseStudents };
    });

    setCourses(coursesWithStudents);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const addCourse = useCallback(async (
    name: string, lectures: LectureInfo[], section?: string,
    schedule?: { lectureDays: number[]; lectureTime: string; semesterStart: string; semesterEnd: string }
  ): Promise<string> => {
    if (!user) return "";
    const { data, error } = await db.from("courses").insert({
      user_id: user.id, name, section: section || "",
      lecture_count: lectures.length, lectures,
      max_bonus: 3, max_exam1: 20, max_exam2: 20, max_final: 40, max_participation: 10, max_homework: 10,
      bonus_enabled: true, custom_components: [],
      lecture_days: schedule?.lectureDays || [], lecture_time: schedule?.lectureTime || "",
      semester_start: schedule?.semesterStart || "", semester_end: schedule?.semesterEnd || "",
    }).select().single();
    if (error || !data) { console.error("Error adding course:", error); return ""; }
    await fetchCourses();
    return data.id;
  }, [user, fetchCourses]);

  const updateCourse = useCallback(async (courseId: string, updates: Partial<Omit<Course, "id" | "students">>) => {
    const u: any = {};
    if (updates.name !== undefined) u.name = updates.name;
    if (updates.section !== undefined) u.section = updates.section;
    if (updates.lectureCount !== undefined) u.lecture_count = updates.lectureCount;
    if (updates.lectures !== undefined) u.lectures = updates.lectures;
    if (updates.maxBonus !== undefined) u.max_bonus = updates.maxBonus;
    if (updates.maxExam1 !== undefined) u.max_exam1 = updates.maxExam1;
    if (updates.maxExam2 !== undefined) u.max_exam2 = updates.maxExam2;
    if (updates.maxFinal !== undefined) u.max_final = updates.maxFinal;
    if (updates.maxParticipation !== undefined) u.max_participation = updates.maxParticipation;
    if ((updates as any).maxHomework !== undefined) u.max_homework = (updates as any).maxHomework;
    if (updates.lectureDays !== undefined) u.lecture_days = updates.lectureDays;
    if (updates.lectureTime !== undefined) u.lecture_time = updates.lectureTime;
    if (updates.semesterStart !== undefined) u.semester_start = updates.semesterStart;
    if (updates.semesterEnd !== undefined) u.semester_end = updates.semesterEnd;
    if ((updates as any).componentLabels !== undefined) u.component_labels = (updates as any).componentLabels;
    if ((updates as any).bonusEnabled !== undefined) u.bonus_enabled = (updates as any).bonusEnabled;
    if ((updates as any).customComponents !== undefined) u.custom_components = (updates as any).customComponents;
    if ((updates as any).hiddenComponents !== undefined) u.hidden_components = (updates as any).hiddenComponents;

    // Auto-regenerate lectures if schedule changed
    const course = courses.find((c) => c.id === courseId);
    const scheduleChanged =
      updates.lectureDays !== undefined ||
      updates.semesterStart !== undefined ||
      updates.semesterEnd !== undefined;
    if (course && scheduleChanged && updates.lectures === undefined) {
      const days = updates.lectureDays ?? course.lectureDays ?? [];
      const start = updates.semesterStart ?? course.semesterStart;
      const end = updates.semesterEnd ?? course.semesterEnd;
      if (days.length > 0 && start && end) {
        const { generateLectureDates } = await import("@/lib/lectures");
        const newLectures = generateLectureDates(new Date(start), new Date(end), days).map((l) => ({
          date: l.date.toISOString(),
          label: l.label,
        }));
        u.lectures = newLectures;
        u.lecture_count = newLectures.length;
      }
    }

    const { error } = await db.from("courses").update(u).eq("id", courseId);
    if (error) { console.error("Error updating course:", error); return; }

    // Resize student arrays if lecture_count changed
    if (course && u.lecture_count !== undefined && u.lecture_count !== course.lectureCount) {
      const newCount = u.lecture_count as number;
      for (const s of course.students) {
        const oldBonus = s.lectureBonus || [];
        const oldAtt = s.attendance || [];
        const newBonus =
          newCount > oldBonus.length
            ? [...oldBonus, ...new Array(newCount - oldBonus.length).fill(0)]
            : oldBonus.slice(0, newCount);
        const newAtt =
          newCount > oldAtt.length
            ? [...oldAtt, ...new Array(newCount - oldAtt.length).fill(true)]
            : oldAtt.slice(0, newCount);
        await db.from("students").update({ lecture_bonus: newBonus, attendance: newAtt }).eq("id", s.id);
      }
    }
    await fetchCourses();
  }, [courses, fetchCourses]);


  const addStudentsToCourse = useCallback(async (courseId: string, names: string[]) => {
    if (!user) return;
    const course = courses.find((c) => c.id === courseId);
    const lc = course?.lectureCount || 0;
    const rows = names.map((name) => ({
      course_id: courseId, user_id: user.id, name,
      lecture_bonus: new Array(lc).fill(0), attendance: new Array(lc).fill(true),
      exam1: 0, exam2: 0, final_exam: 0, participation: 0, homework: 0, custom_scores: {},
    }));
    const { error } = await db.from("students").insert(rows);
    if (error) console.error("Error adding students:", error);
    else await fetchCourses();
  }, [user, courses, fetchCourses]);

  const updateStudent = useCallback(async (_courseId: string, studentId: string, updates: Partial<Student>) => {
    const u: any = {};
    if (updates.name !== undefined) u.name = updates.name;
    if (updates.lectureBonus !== undefined) u.lecture_bonus = updates.lectureBonus;
    if (updates.attendance !== undefined) u.attendance = updates.attendance;
    if (updates.exam1 !== undefined) u.exam1 = updates.exam1;
    if (updates.exam2 !== undefined) u.exam2 = updates.exam2;
    if (updates.finalExam !== undefined) u.final_exam = updates.finalExam;
    if (updates.participation !== undefined) u.participation = updates.participation;
    if ((updates as any).homework !== undefined) u.homework = (updates as any).homework;
    if ((updates as any).customScores !== undefined) u.custom_scores = (updates as any).customScores;
    const { error } = await db.from("students").update(u).eq("id", studentId);
    if (error) console.error("Error updating student:", error);
    else await fetchCourses();
  }, [fetchCourses]);

  const updateLectureBonus = useCallback(async (courseId: string, studentId: string, lectureIndex: number, value: number) => {
    const student = courses.find((c) => c.id === courseId)?.students.find((s) => s.id === studentId);
    if (!student) return;
    const newBonus = [...student.lectureBonus];
    newBonus[lectureIndex] = value;
    const { error } = await db.from("students").update({ lecture_bonus: newBonus }).eq("id", studentId);
    if (error) console.error("Error updating bonus:", error);
    else await fetchCourses();
  }, [courses, fetchCourses]);

  const updateAttendance = useCallback(async (courseId: string, studentId: string, lectureIndex: number, present: boolean) => {
    const course = courses.find((c) => c.id === courseId);
    const student = course?.students.find((s) => s.id === studentId);
    if (!student || !course) return;
    const newAtt = [...(student.attendance || new Array(course.lectureCount).fill(true))];
    newAtt[lectureIndex] = present;
    const { error } = await db.from("students").update({ attendance: newAtt }).eq("id", studentId);
    if (error) console.error("Error updating attendance:", error);
    else await fetchCourses();
  }, [courses, fetchCourses]);




  const deleteCourse = useCallback(async (courseId: string) => {
    const { error } = await db.from("courses").delete().eq("id", courseId);
    if (error) console.error("Error deleting course:", error);
    else await fetchCourses();
  }, [fetchCourses]);

  const deleteStudent = useCallback(async (_courseId: string, studentId: string) => {
    const { error } = await db.from("students").delete().eq("id", studentId);
    if (error) console.error("Error deleting student:", error);
    else await fetchCourses();
  }, [fetchCourses]);

  const syncStudentsToCourse = useCallback(async (courseId: string, names: string[]) => {
    if (!user) return;
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const lc = course.lectureCount || 0;

    const incomingSet = new Set(names.map((n) => n.trim()));
    const toDelete = course.students.filter((s) => !incomingSet.has(s.name.trim())).map((s) => s.id);
    const existingNames = new Set(course.students.map((s) => s.name.trim()));
    const toAdd = names.filter((n) => !existingNames.has(n.trim()));

    if (toDelete.length > 0) {
      await db.from("students").delete().in("id", toDelete);
    }
    if (toAdd.length > 0) {
      const rows = toAdd.map((name) => ({
        course_id: courseId, user_id: user.id, name,
        lecture_bonus: new Array(lc).fill(0), attendance: new Array(lc).fill(true),
        exam1: 0, exam2: 0, final_exam: 0, participation: 0, homework: 0, custom_scores: {},
      }));
      await db.from("students").insert(rows);
    }
    await fetchCourses();
  }, [user, courses, fetchCourses]);

  const addLecture = useCallback(async (courseId: string) => {
    const DAYS_AR: Record<number, string> = {
      0: "الأحد", 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء",
      4: "الخميس", 5: "الجمعة", 6: "السبت",
    };
    const now = new Date();
    const label = `${DAYS_AR[now.getDay()]} ${format(now, "MM/dd")}`;
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    await db.from("courses").update({
      lecture_count: course.lectureCount + 1,
      lectures: [...course.lectures, { date: now.toISOString(), label }],
    }).eq("id", courseId);

    for (const s of course.students) {
      await db.from("students").update({
        lecture_bonus: [...s.lectureBonus, 0],
        attendance: [...(s.attendance || []), true],
      }).eq("id", s.id);
    }
    await fetchCourses();
  }, [courses, fetchCourses]);

  const deleteAllData = useCallback(async () => {
    if (!user) return;
    await db.from("courses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await fetchCourses();
  }, [user, fetchCourses]);

  const exportAllData = useCallback(() => {
    const data = JSON.stringify(courses, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "student-grades-backup.json"; a.click();
    URL.revokeObjectURL(url);
  }, [courses]);

  const importAllData = useCallback(async (file: File): Promise<void> => {
    if (!user) return;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string) as Course[];
          await db.from("courses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
          for (const course of imported) {
            const { data: nc } = await db.from("courses").insert({
              user_id: user.id, name: course.name, section: course.section || "",
              lecture_count: course.lectureCount, lectures: course.lectures,
              max_bonus: course.maxBonus, max_exam1: course.maxExam1,
              max_exam2: course.maxExam2, max_final: course.maxFinal,
              max_participation: course.maxParticipation,
              max_homework: (course as any).maxHomework || 10,
              bonus_enabled: (course as any).bonusEnabled !== false,
              custom_components: (course as any).customComponents || [],
              lecture_days: course.lectureDays || [], lecture_time: course.lectureTime || "",
              semester_start: course.semesterStart || "", semester_end: course.semesterEnd || "",
            }).select().single();
            if (nc && course.students.length > 0) {
              await db.from("students").insert(course.students.map((s: Student) => ({
                course_id: nc.id, user_id: user.id, name: s.name,
                lecture_bonus: s.lectureBonus, attendance: s.attendance,
                exam1: s.exam1, exam2: s.exam2, final_exam: s.finalExam, participation: s.participation,
                homework: (s as any).homework || 0,
                custom_scores: (s as any).customScores || {},
              })));
            }
          }
          await fetchCourses();
          resolve();
        } catch { reject(new Error("فشل في قراءة ملف النسخة الاحتياطية")); }
      };
      reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
      reader.readAsText(file);
    });
  }, [user, fetchCourses]);

  return {
    courses, loading, addCourse, updateCourse, addStudentsToCourse, syncStudentsToCourse,
    updateStudent, updateLectureBonus, updateAttendance, importPaaetAttendance,
    deleteCourse, deleteStudent, addLecture, deleteAllData, exportAllData, importAllData,
  };
}
