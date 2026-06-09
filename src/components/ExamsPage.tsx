import { useState, useRef } from "react";
import { Student, ComponentLabels, DEFAULT_COMPONENT_LABELS } from "@/types/student";
import { FileSpreadsheet, Loader2, ChevronLeft, ChevronRight, Search, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { importAllGradesFromExcel, type GradeMatch } from "@/lib/ocr";
import NumberInput from "@/components/NumberInput";

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
  componentLabels?: ComponentLabels;
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
  componentLabels,
  onUpdateStudent,
}: ExamsPageProps) {
  const [activeTab, setActiveTab] = useState<ExamKey>("exam1");
  const [importLoading, setImportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<null | {
    matches: GradeMatch[];
    unmatched: { name: string; score: number }[];
    missing: { id: string; name: string }[];
  }>(null);

  const L = { ...DEFAULT_COMPONENT_LABELS, ...(componentLabels || {}) };
  const tabs: ExamTabConfig[] = [
    { key: "exam1", label: L.exam1, max: maxExam1 },
    { key: "exam2", label: L.exam2, max: maxExam2 },
    { key: "finalExam", label: L.finalExam, max: maxFinal },
    { key: "participation", label: L.participation, max: maxParticipation },
    { key: "homework", label: L.homework, max: maxHomework },
  ];

  const currentTab = tabs.find((t) => t.key === activeTab)!;
  const currentTabIndex = tabs.findIndex((t) => t.key === activeTab);
  const maxByKey = Object.fromEntries(tabs.map((t) => [t.key, t.max])) as Record<ExamKey, number>;
  const labelByKey = Object.fromEntries(tabs.map((t) => [t.key, t.label])) as Record<ExamKey, string>;
  const filteredStudents = searchQuery
    ? students.filter((s) => s.name.includes(searchQuery))
    : students;

  const goNextTab = () => {
    if (currentTabIndex < tabs.length - 1) setActiveTab(tabs[currentTabIndex + 1].key);
  };
  const goPrevTab = () => {
    if (currentTabIndex > 0) setActiveTab(tabs[currentTabIndex - 1].key);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    const name = file.name.toLowerCase();
    const isSupported =
      file.type.includes("spreadsheet") ||
      file.type === "text/csv" ||
      name.endsWith(".csv") ||
      name.endsWith(".xlsx") ||
      name.endsWith(".xls");
    if (!isSupported) {
      toast.error("صيغة غير مدعومة. ارفع ملف Excel (.xlsx / .xls) أو CSV");
      return;
    }

    setImportLoading(true);
    try {
      const result = await importAllGradesFromExcel(
        file,
        students.map((s) => ({ id: s.id, name: s.name })),
        maxByKey,
      );

      if (!result.matches.length && !result.unmatchedRows.length) {
        toast.error("لم يتم العثور على درجات في الملف. تأكد أن الملف يحتوي على أعمدة الأسماء والدرجات.");
        return;
      }

      setPreview({
        matches: result.matches,
        unmatched: result.unmatchedRows,
        missing: result.missingStudents,
      });
    } catch (err: any) {
      toast.error(err?.message || "فشل في قراءة الملف");
    } finally {
      setImportLoading(false);
    }
  };

  const applyPreview = () => {
    if (!preview) return;
    for (const m of preview.matches) {
      if (m.scores) {
        const updates = Object.fromEntries(
          Object.entries(m.scores).map(([key, value]) => [key, clamp(Number(value), maxByKey[key as ExamKey])]),
        ) as Partial<Student>;
        onUpdateStudent(m.studentId, updates);
      } else {
        const v = clamp(m.score, currentTab.max);
        onUpdateStudent(m.studentId, { [currentTab.key]: v });
      }
    }
    toast.success(`تم حفظ ${preview.matches.length} درجة بنجاح ✅`);
    setPreview(null);
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
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleExcelUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importLoading}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 font-display text-sm font-semibold text-accent-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
        >
          {importLoading ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          استيراد من Excel
        </button>
        <p className="hidden sm:block text-xs text-muted-foreground">
          ارفع ملف Excel أو CSV — المطابقة بحسب اسم الطالب (لا يهم ترتيب الأسماء)
        </p>
      </div>

      {/* Import Preview Dialog */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-card shadow-2xl border border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-display text-lg font-bold">مراجعة الدرجات قبل الحفظ</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  سيتم تحديث كل أعمدة الاختبارات الموجودة في الملف
                </p>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-2xl font-bold text-primary">{preview.matches.length}</p>
                  <p className="text-[11px] text-muted-foreground">سيتم تحديثها</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <p className="text-2xl font-bold text-amber-600">{preview.missing.length}</p>
                  <p className="text-[11px] text-muted-foreground">طلبة بدون درجة</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3">
                  <p className="text-2xl font-bold text-destructive">{preview.unmatched.length}</p>
                  <p className="text-[11px] text-muted-foreground">أسماء غير مطابقة</p>
                </div>
              </div>

              {/* Matched rows */}
              {preview.matches.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">التغييرات (قديم ← جديد):</p>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        {preview.matches.map((m) => {
                          const student = students.find((s) => s.id === m.studentId);
                          const entries = m.scores
                            ? Object.entries(m.scores) as [ExamKey, number][]
                            : [[currentTab.key, m.score] as [ExamKey, number]];
                          return (
                            <tr key={m.studentId} className="border-b border-border/50 last:border-0">
                              <td className="px-3 py-2 font-medium">{m.studentName}</td>
                              <td className="px-3 py-2 text-center w-52">
                                <div className="space-y-1 text-xs">
                                  {entries.map(([key, value]) => {
                                    const old = (student?.[key] as number) || 0;
                                    const next = clamp(value, maxByKey[key]);
                                    const changed = old !== next;
                                    return (
                                      <div key={key} className={cn("flex items-center justify-between gap-2", !changed && "text-muted-foreground")}>
                                        <span>{labelByKey[key]}</span>
                                        <span>
                                          {old} <span className="mx-1">←</span>{" "}
                                          <span className={cn("font-bold", changed && "text-primary")}>{next}</span>
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Unmatched names */}
              {preview.unmatched.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-destructive">
                    <AlertCircle size={14} />
                    <p className="text-xs font-semibold">أسماء في الملف لم يتم التعرف عليها:</p>
                  </div>
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 space-y-1">
                    {preview.unmatched.map((u, i) => (
                      <div key={i} className="text-xs flex justify-between gap-2">
                        <span className="truncate">{u.name}</span>
                        <span className="font-bold shrink-0">{u.score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing students */}
              {preview.missing.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-amber-600">
                    <AlertCircle size={14} />
                    <p className="text-xs font-semibold">طلبة في المقرر ليس لهم درجة في الملف:</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 space-y-1 max-h-40 overflow-y-auto">
                    {preview.missing.map((s) => (
                      <div key={s.id} className="text-xs">{s.name}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 p-4 border-t border-border">
              <button
                onClick={() => setPreview(null)}
                className="flex-1 rounded-lg border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted"
              >
                إلغاء
              </button>
              <button
                onClick={applyPreview}
                disabled={preview.matches.length === 0}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-md hover:brightness-110 disabled:opacity-50"
              >
                حفظ {preview.matches.length} درجة
              </button>
            </div>
          </div>
        </div>
      )}

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
                <NumberInput
                  value={currentVal}
                  onChange={(v) => onUpdateStudent(student.id, { [currentTab.key]: v })}
                  min={0}
                  max={currentTab.max}
                  className="w-14 px-1 py-1.5 text-sm font-bold"
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
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => {
                        const curr = (student[currentTab.key] as number) || 0;
                        onUpdateStudent(student.id, { [currentTab.key]: clamp(curr - 1, currentTab.max) });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive font-bold transition-colors hover:bg-destructive/20"
                    >
                      −
                    </button>
                    <NumberInput
                      value={(student[currentTab.key] as number) || 0}
                      onChange={(v) => onUpdateStudent(student.id, { [currentTab.key]: v })}
                      min={0}
                      max={currentTab.max}
                      className="w-16"
                    />

                    <button
                      onClick={() => {
                        const curr = (student[currentTab.key] as number) || 0;
                        onUpdateStudent(student.id, { [currentTab.key]: clamp(curr + 1, currentTab.max) });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary font-bold transition-colors hover:bg-primary/20"
                    >
                      +
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
