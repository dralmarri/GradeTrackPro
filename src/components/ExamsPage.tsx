import { useState, useRef } from "react";
import { Student } from "@/types/student";
import { FileText, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type ExamKey = "exam1" | "exam2" | "finalExam" | "participation" | "homework";

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
  maxHomework: number;
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
  maxHomework,
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
    { key: "homework", label: "الواجب", max: maxHomework },
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
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء رفع صورة (JPG/PNG). دعم PDF قريباً.");
      return;
    }

    setOcrLoading(true);
    const tId = toast.loading("جارٍ قراءة الصورة بالذكاء الاصطناعي...");
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("ocr-exam-grades", {
        body: {
          imageBase64: base64,
          mimeType: file.type,
          studentNames: students.map((s) => s.name),
          maxScore: currentTab.max,
          examLabel: currentTab.label,
        },
      });

      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const grades: { name: string; score: number }[] = (data as any)?.grades ?? [];
      if (!grades.length) {
        toast.dismiss(tId);
        toast.error("لم يتم استخراج أي درجات من الصورة");
        return;
      }

      // Match by exact name, then by best inclusion overlap
      const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
      let matched = 0;
      for (const g of grades) {
        const target = normalize(g.name);
        let student =
          students.find((s) => normalize(s.name) === target) ||
          students.find((s) => normalize(s.name).includes(target) || target.includes(normalize(s.name)));
        if (student) {
          const v = clamp(Number(g.score) || 0, currentTab.max);
          onUpdateStudent(student.id, { [currentTab.key]: v });
          matched++;
        }
      }

      toast.dismiss(tId);
      if (matched > 0) toast.success(`تم استخراج ${matched} درجة بنجاح ✅`);
      else toast.error("تعذّر مطابقة الأسماء المستخرجة مع قائمة الطلاب");
    } catch (err: any) {
      toast.dismiss(tId);
      toast.error(err?.message || "فشل في قراءة الصورة");
    } finally {
      setOcrLoading(false);
    }
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
                <input
                  type="number"
                  min={0}
                  max={currentTab.max}
                  value={currentVal || ""}
                  onChange={(e) => {
                    const v = clamp(Number(e.target.value), currentTab.max);
                    onUpdateStudent(student.id, { [currentTab.key]: v });
                  }}
                  className="w-12 rounded-lg border border-border bg-background px-1 py-1.5 text-center text-sm font-bold outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
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
