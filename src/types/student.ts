export interface CustomComponent {
  key: string;       // unique, e.g. "custom_1"
  label: string;
  max: number;
}

export interface Student {
  id: string;
  name: string;
  studentNumber?: string;  // bubbled sheet number — learned automatically on first scan
  lectureBonus: number[];
  attendance: boolean[]; // true = present (default), false = absent
  lectureNotes?: string[]; // free-text per-lecture note, one slot per lecture index
  exam1: number;
  exam2: number;
  finalExam: number;
  participation: number;
  homework: number;
  customScores?: Record<string, number>;
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
  exam1: "الامتحان الفصلي الأول",
  exam2: "الامتحان الفصلي الثاني",
  finalExam: "الامتحان النهائي",
  participation: "مشاركة",
  homework: "واجب",
  bonus: "بونص",
};

export function getLabel(course: { componentLabels?: ComponentLabels }, key: keyof ComponentLabels): string {
  return course.componentLabels?.[key] || DEFAULT_COMPONENT_LABELS[key];
}

export type StandardComponentKey = "exam1" | "exam2" | "finalExam" | "participation" | "homework";

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
  bonusEnabled?: boolean;
  customComponents?: CustomComponent[];
  hiddenComponents?: StandardComponentKey[];
}
