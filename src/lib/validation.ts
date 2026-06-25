import { Course } from "@/types/student";

export interface ValidationIssue {
  studentId: string;
  studentName: string;
  field: string;
  message: string;
}

/**
 * Validate that grades are within course-defined limits and that
 * participation matches attendance.
 */
export function validateCourse(course: Course): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const s of course.students) {
    if (s.exam1 < 0 || s.exam1 > course.maxExam1)
      issues.push({ studentId: s.id, studentName: s.name, field: "exam1", message: `الاختبار الأول خارج النطاق (0-${course.maxExam1})` });
    if (s.exam2 < 0 || s.exam2 > course.maxExam2)
      issues.push({ studentId: s.id, studentName: s.name, field: "exam2", message: `الاختبار الثاني خارج النطاق (0-${course.maxExam2})` });
    if (s.finalExam < 0 || s.finalExam > course.maxFinal)
      issues.push({ studentId: s.id, studentName: s.name, field: "final", message: `الاختبار النهائي خارج النطاق (0-${course.maxFinal})` });
    if (s.participation < 0 || s.participation > course.maxParticipation)
      issues.push({ studentId: s.id, studentName: s.name, field: "participation", message: `المشاركة خارج النطاق (0-${course.maxParticipation})` });

    // Cross-check participation against attendance
    const att = s.attendance || [];
    if (att.length > 0) {
      const absences = att.filter((p) => p === false).length;
      const expected = Math.max(0, course.maxParticipation - absences);
      if (s.participation !== expected) {
        issues.push({
          studentId: s.id,
          studentName: s.name,
          field: "participation",
          message: `المشاركة (${s.participation}) لا تطابق الحضور (المتوقع ${expected} بـ ${absences} غياب)`,
        });
      }
    }
  }
  return issues;
}

export function validateStudentName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "الاسم مطلوب";
  if (trimmed.length > 120) return "الاسم طويل جداً";
  return null;
}
