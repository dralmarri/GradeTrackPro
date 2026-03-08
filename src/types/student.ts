export interface Student {
  id: string;
  name: string;
  lectureBonus: number[];
  exam1: number;
  exam2: number;
  finalExam: number;
  participation: number;
}

export interface Course {
  id: string;
  name: string;
  students: Student[];
  lectureCount: number;
  maxBonus: number;
  maxExam1: number;
  maxExam2: number;
  maxFinal: number;
  maxParticipation: number;
}
