export interface Student {
  id: string;
  name: string;
  lectureBonus: number[];
  attendance: boolean[]; // true = present (default), false = absent
  exam1: number;
  exam2: number;
  finalExam: number;
  participation: number;
  homework: number;
}

export interface LectureInfo {
  date: string;
  label: string;
}

export interface ComponentLabels {
  exam1?: string;
  exam2?: string;
  finalExam?: string;
  participation?: string;
  homework?: string;
  bonus?: string;
}

export const DEFAULT_COMPONENT_LABELS: Required<ComponentLabels> = {
  exam1: "اختبار أول",
  exam2: "اختبار ثاني",
  finalExam: "نهائي",
  participation: "مشاركة",
  homework: "واجب",
  bonus: "بونص",
};

export function getLabel(course: { componentLabels?: ComponentLabels }, key: keyof ComponentLabels): string {
  return course.componentLabels?.[key] || DEFAULT_COMPONENT_LABELS[key];
}

export interface Course {
  id: string;
  name: string;
  section: string;
  students: Student[];
  lectureCount: number;
  lectures: LectureInfo[];
  maxBonus: number;
  maxExam1: number;
  maxExam2: number;
  maxFinal: number;
  maxParticipation: number;
  maxHomework: number;
  lectureDays: number[];
  lectureTime: string;
  semesterStart: string;
  semesterEnd: string;
  componentLabels?: ComponentLabels;
}
