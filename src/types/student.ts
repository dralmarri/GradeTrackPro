export interface Student {
  id: string;
  name: string;
  lectureBonus: number[];
  exam1: number;
  exam2: number;
  finalExam: number;
  participation: number;
}

export interface LectureInfo {
  date: string;
  label: string;
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
}
