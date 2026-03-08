import { format } from "date-fns";

const DAYS_AR: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

export const WEEKDAYS = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الاثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
];

export interface LectureDate {
  date: Date;
  label: string;
}

export function generateLectureDates(
  startDate: Date,
  endDate: Date,
  selectedDays: number[]
): LectureDate[] {
  const lectures: LectureDate[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    if (selectedDays.includes(current.getDay())) {
      lectures.push({
        date: new Date(current),
        label: `${DAYS_AR[current.getDay()]} ${format(current, "MM/dd")}`,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return lectures;
}
