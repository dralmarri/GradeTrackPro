import { useState, useRef } from "react";
import { Student, ComponentLabels, CustomComponent, DEFAULT_COMPONENT_LABELS } from "@/types/student";
import { FileSpreadsheet, Loader2, Search, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { importAllGradesFromExcel, type GradeMatch } from "@/lib/ocr";
import NumberInput from "@/components/NumberInput";
import { useLanguage } from "@/hooks/useLanguage";
import { tf } from "@/lib/translations";

type StandardKey = "exam1" | "exam2" | "finalExam" | "participation" | "homework";

interface ExamTabConfig {
  key: string;
  label: string;
  max: number;
  isCustom: boolean;
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
  customComponents?: CustomComponent[];
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
  customComponents,
  onUpdateStudent,
}: ExamsPageProps) {
  const { t } = useLanguage();
  const L = { ...DEFAULT_COMPONENT_LABELS, ...(componentLabels || {}) };
  const customs = customComponents || [];

  const tabs: ExamTabConfig[] = [
    { key: "exam1", label: L.exam1, max: maxExam1, isCustom: false },
    { key: "exam2", label: L.exam2, max: maxExam2, isCustom: false },
    { key: "finalExam", label: L.finalExam, max: maxFinal, isCustom: false },
    { key: "participation", label: L.participation, max: maxParticipation, isCustom: false },
    { key: "homework", label: L.homework, max: maxHomework, isCustom: false },
    ...customs.map((c) => ({ key: c.key, label: c.label, max: c.max, isCustom: true })),
  ];

  const [activeTabKey, setActiveTabKey] = useState<string>("exam1");
  const [importLoading, setImportLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<null | {
    matches: GradeMatch[];
    unmatched: { name: string; score: number }[];
    missing: { id: string; name: string }[];
  }>(null);

  const currentTab = tabs.find((t) => t.key === activeTabKey) || tabs[0];
  const filteredStudents = searchQuery
    ? students.filter((s) => s.name.includes(searchQuery))
    : students;

  const getVal = (s: Student): number => {
    if (currentTab.isCustom) return Number(s.customScores?.[currentTab.key] || 0);
    return Number((s as any)[currentTab.key]) || 0;
  };

  const setVal = (s: Student, v: number) => {
    const clamped = clamp(v, currentTab.max);
    if (currentTab.isCustom) {
      const next = { ...(s.customScores || {}), [currentTab.key]: clamped };
      onUpdateStudent(s.id, { customScores: next } as Partial<Student>);
    } else {
      onUpdateStudent(s.id, { [currentTab.key]: clamped } as Partial<Student>);
    }
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
      toast.error(t("unsupportedFile"));
      return;
    }

    setImportLoading(true);
    try {
      const maxByKey: Record<StandardKey, number> = {
        exam1: maxExam1, exam2: maxExam2, finalExam: maxFinal,
        participation: maxParticipation, homework: maxHomework,
      };
      const result = await importAllGradesFromExcel(
        file,
        students.map((s) => ({ id: s.id, name: s.name })),
        maxByKey,
      );

      if (!result.matches.length && !result.unmatchedRows.length) {
        toast.error(t("noGradesFound"));
        return;
      }

      setPreview({
        matches: result.matches,
        unmatched: result.unmatchedRows,
        missing: result.missingStudents,
      });
    } catch (err: any) {
      toast.error(err?.message || t("fileReadFailed"));
    } finally {
      setImportLoading(false);
    }
  };

  const applyPreview = () => {
    if (!preview) return;
    const maxByKey: Record<StandardKey, number> = {
      exam1: maxExam1, exam2: maxExam2, finalExam: maxFinal,
      participation: maxParticipation, homework: maxHomework,
    };
    for (const m of preview.matches) {
      if (m.scores) {
        const updates = Object.fromEntries(
          Object.entries(m.scores).map(([key, value]) => [key, clamp(Number(value), maxByKey[key as StandardKey])]),
        ) as Partial<Student>;
        onUpdateStudent(m.studentId, updates);
      }
    }
    toast.success(tf(t("gradesSaved"), { n: preview.matches.length }));
    setPreview(null);
  };

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="font-display text-lg">{t("noStudentsImportFirst")}</p>
        <p className="text-sm">{t("importFirstFromBonus")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pill tab cards */}
      <div className={cn(
        "grid gap-2",
        tabs.length <= 3 ? "grid-cols-3" : tabs.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-5"
      )}>
        {tabs.map((tab) => {
          const active = activeTabKey === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTabKey(tab.key)}
              className={cn(
                "rounded-2xl border-2 px-3 py-3 sm:py-4 text-center transition-all",
                active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/30"
              )}
            >
              <p className={cn(
                "font-display text-sm sm:text-base font-bold",
                active ? "text-primary" : "text-foreground"
              )}>{tab.label}</p>
              <p className="mt-0.5 text-[11px] sm:text-xs text-muted-foreground">
                {tf(t("ofMaxGrade"), { max: tab.max })}
              </p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("searchByName")}
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
          {t("importFromExcel")}
        </button>
        <p className="hidden sm:block text-xs text-muted-foreground">
          {t("importHint")}
        </p>
      </div>

      {/* Import Preview Dialog */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-card shadow-2xl border border-border">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h3 className="font-display text-lg font-bold">{t("reviewGrades")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("reviewGradesHint")}</p>
              </div>
              <button onClick={() => setPreview(null)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-2xl font-bold text-primary">{preview.matches.length}</p>
                  <p className="text-[11px] text-muted-foreground">{t("willBeUpdated")}</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <p className="text-2xl font-bold text-amber-600">{preview.missing.length}</p>
                  <p className="text-[11px] text-muted-foreground">{t("studentsWithoutGrade")}</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3">
                  <p className="text-2xl font-bold text-destructive">{preview.unmatched.length}</p>
                  <p className="text-[11px] text-muted-foreground">{t("unmatchedNames")}</p>
                </div>
              </div>

              {preview.unmatched.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 text-destructive">
                    <AlertCircle size={14} />
                    <p className="text-xs font-semibold">{t("unrecognizedNames")}</p>
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
            </div>

            <div className="flex gap-2 p-4 border-t border-border">
              <button onClick={() => setPreview(null)} className="flex-1 rounded-lg border border-border bg-background py-2.5 text-sm font-medium hover:bg-muted">
                {t("cancel")}
              </button>
              <button onClick={applyPreview} disabled={preview.matches.length === 0} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground shadow-md hover:brightness-110 disabled:opacity-50">
                {tf(t("saveNGrades"), { n: preview.matches.length })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile card layout */}
      <div className="space-y-2 sm:hidden">
        {filteredStudents.map((student, idx) => {
          const currentVal = getVal(student);
          return (
            <div key={student.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{student.name}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setVal(student, currentVal - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive font-bold text-lg transition-colors active:bg-destructive/20"
                >−</button>
                <NumberInput
                  value={currentVal}
                  onChange={(v) => setVal(student, v)}
                  min={0}
                  max={currentTab.max}
                  className="w-14 px-1 py-1.5 text-sm font-bold"
                />
                <button
                  onClick={() => setVal(student, currentVal + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-lg transition-colors active:bg-primary/20"
                >+</button>
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
              <th className="min-w-[180px] px-3 py-3 text-right font-display font-semibold">{t("studentName")}</th>
              <th className="px-3 py-3 text-center font-display font-semibold w-28">
                {currentTab.label}
                <br />
                <span className="text-[10px] font-normal text-muted-foreground">
                  {tf(t("ofMaxGrade"), { max: currentTab.max })}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student, idx) => {
              const currentVal = getVal(student);
              return (
                <tr key={student.id} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="px-3 py-2.5 font-medium">{student.name}</td>
                  <td className="px-3 py-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setVal(student, currentVal - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 text-destructive font-bold transition-colors hover:bg-destructive/20"
                      >−</button>
                      <NumberInput
                        value={currentVal}
                        onChange={(v) => setVal(student, v)}
                        min={0}
                        max={currentTab.max}
                        className="w-16"
                      />
                      <button
                        onClick={() => setVal(student, currentVal + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary font-bold transition-colors hover:bg-primary/20"
                      >+</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
