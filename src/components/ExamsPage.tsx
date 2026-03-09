import { useState, useRef } from "react";
import { Student } from "@/types/student";
import { FileText, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ExamKey = "exam1" | "exam2" | "finalExam" | "participation";

interface ExamTabConfig {
  key: ExamKey;
  label: string;
  max: number;
}

interface ExamsPageProps {
  students: Student[];
  courseId: string;
  maxExam1: number;
  maxExam2: number;
  maxFinal: number;
  maxParticipation: number;
  onUpdateStudent: (studentId: string, updates: Partial<Student>) => void;
}

function clamp(val: number, max: number) {
  return Math.max(0, Math.min(val, max));
}

export default function ExamsPage({
  students,
  maxExam1,
  maxExam2,
  maxFinal,
  maxParticipation,
  onUpdateStudent,
}: ExamsPageProps) {
  const [activeTab, setActiveTab] = useState<ExamKey>("exam1");
  const [ocrLoading, setOcrLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: ExamTabConfig[] = [
    { key: "exam1", label: "الاختبار الأول", max: maxExam1 },
    { key: "exam2", label: "الاختبار الثاني", max: maxExam2 },
    { key: "finalExam", label: "الاختبار النهائي", max: maxFinal },
    { key: "participation", label: "المشاركة", max: maxParticipation },
  ];

  const currentTab = tabs.find((t) => t.key === activeTab)!;
  const currentTabIndex = tabs.findIndex((t) => t.key === activeTab);
  const filteredStudents = searchQuery
    ? students.filter((s) => s.name.includes(searchQuery))
    : students;

  const goNextTab = () => {
    if (currentTabIndex < tabs.length - 1) setActiveTab(tabs[currentTabIndex + 1].key);
  };
  const goPrevTab = () => {
    if (currentTabIndex > 0) setActiveTab(tabs[currentTabIndex - 1].key);
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    toast.info("جارٍ قراءة الملف بالذكاء الاصطناعي...");
    setTimeout(() => {
      setOcrLoading(false);
      toast.error("يجب تفعيل Lovable Cloud لاستخدام ميزة OCR بالذكاء الاصطناعي");
    }, 1500);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">لا يوجد طلبة بعد</p>
        <p className="text-sm">قم باستيراد كشف Excel أولاً من صفحة البونص</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab navigation - mobile friendly */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-sm sm:hidden">
        <button
          onClick={goPrevTab}
          disabled={currentTabIndex === 0}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-display text-sm font-bold text-foreground">{currentTab.label}</p>
          <p className="text-[11px] text-muted-foreground">من {currentTab.max} درجة</p>
        </div>
        <button
          onClick={goNextTab}
          disabled={currentTabIndex === tabs.length - 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Desktop tabs */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {tab.label}
            <span className="mr-1.5 text-xs opacity-70">({tab.max})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="بحث باسم الطالب..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-input bg-background pr-9 pl-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleOcrUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrLoading}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-display text-sm font-semibold text-accent-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {ocrLoading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
          قراءة بالذكاء الاصطناعي (OCR)
        </button>
        <p className="hidden sm:block text-xs text-muted-foreground">
          ارفع صورة أو PDF للنتائج وسيتم استخراج الدرجات تلقائياً
        </p>
      </div>

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {filteredStudents.map((student, idx) => {
          const currentVal = (student[currentTab.key] as number) || 0;

          return (
            <div
              key={student.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{student.name}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    const v = clamp(currentVal - 1, currentTab.max);
                    onUpdateStudent(student.id, { [currentTab.key]: v });
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive font-bold text-lg transition-colors active:bg-destructive/20"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-bold text-foreground">
                  {currentVal}
                </span>
                <button
                  onClick={() => {
                    const v = clamp(currentVal + 1, currentTab.max);
                    onUpdateStudent(student.id, { [currentTab.key]: v });
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg transition-colors active:bg-primary/20"
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-3 py-3 text-right font-display font-semibold w-12">#</th>
              <th className="min-w-[180px] px-3 py-3 text-right font-display font-semibold">
                اسم الطالب
              </th>
              <th className="px-3 py-3 text-center font-display font-semibold w-28">
                {currentTab.label}
                <br />
                <span className="text-[10px] font-normal text-muted-foreground">
                  (من {currentTab.max})
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, idx) => (
              <tr
                key={student.id}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                <td className="px-3 py-2.5 text-center text-muted-foreground">{idx + 1}</td>
                <td className="px-3 py-2.5 font-medium">{student.name}</td>
                <td className="px-3 py-1.5 text-center">
                  <input
                    type="number"
                    min={0}
                    max={currentTab.max}
                    value={student[currentTab.key] || ""}
                    onChange={(e) => {
                      const v = clamp(Number(e.target.value), currentTab.max);
                      onUpdateStudent(student.id, { [currentTab.key]: v });
                    }}
                    className="w-20 rounded-lg border border-border bg-background px-2 py-2 text-center text-sm font-medium outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
