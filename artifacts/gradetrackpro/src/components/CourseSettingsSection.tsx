import { useEffect, useState } from "react";
import { Award, ChevronDown, Eye, EyeOff, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Course, ComponentLabels, CustomComponent, DEFAULT_COMPONENT_LABELS, StandardComponentKey } from "@/types/student";
import NumberInput from "@/components/NumberInput";
import { useLanguage } from "@/hooks/useLanguage";

interface Props {
  courses: Course[];
  onUpdateCourse: (courseId: string, updates: Partial<Omit<Course, "id" | "students">>) => void;
}

const MAX_CUSTOM = 5;

interface Draft {
  maxBonus: number;
  maxExam1: number;
  maxExam2: number;
  maxFinal: number;
  maxParticipation: number;
  maxHomework: number;
  labels: Required<ComponentLabels>;
  bonusEnabled: boolean;
  customComponents: CustomComponent[];
  hiddenComponents: StandardComponentKey[];
}

function toDraft(c: Course): Draft {
  return {
    maxBonus: c.maxBonus,
    maxExam1: c.maxExam1,
    maxExam2: c.maxExam2,
    maxFinal: c.maxFinal,
    maxParticipation: c.maxParticipation,
    maxHomework: c.maxHomework ?? 10,
    labels: { ...DEFAULT_COMPONENT_LABELS, ...(c.componentLabels || {}) },
    bonusEnabled: c.bonusEnabled !== false,
    customComponents: c.customComponents || [],
    hiddenComponents: c.hiddenComponents || [],
  };
}

export default function CourseSettingsSection({ courses, onUpdateCourse }: Props) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  // Re-sync drafts when courses change
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, Draft> = {};
      for (const c of courses) next[c.id] = prev[c.id] ?? toDraft(c);
      return next;
    });
  }, [courses]);

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const addCustom = (id: string) => {
    const d = drafts[id];
    if (!d) return;
    if (d.customComponents.length >= MAX_CUSTOM) return;
    const usedKeys = new Set(d.customComponents.map((c) => c.key));
    let i = 1;
    while (usedKeys.has(`custom_${i}`)) i++;
    const newComp: CustomComponent = { key: `custom_${i}`, label: lang === "ar" ? "مكوّن جديد" : "New component", max: 10 };
    updateDraft(id, { customComponents: [...d.customComponents, newComp] });
  };

  const updateCustom = (id: string, key: string, patch: Partial<CustomComponent>) => {
    const d = drafts[id];
    if (!d) return;
    updateDraft(id, {
      customComponents: d.customComponents.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    });
  };

  const removeCustom = (id: string, key: string) => {
    const d = drafts[id];
    if (!d) return;
    updateDraft(id, { customComponents: d.customComponents.filter((c) => c.key !== key) });
  };

  const saveCourse = (id: string) => {
    const d = drafts[id];
    if (!d) return;
    onUpdateCourse(id, {
      maxBonus: d.maxBonus,
      maxExam1: d.maxExam1,
      maxExam2: d.maxExam2,
      maxFinal: d.maxFinal,
      maxParticipation: d.maxParticipation,
      maxHomework: d.maxHomework,
      componentLabels: d.labels,
      bonusEnabled: d.bonusEnabled,
      customComponents: d.customComponents,
      hiddenComponents: d.hiddenComponents,
    } as any);
    toast.success(lang === "ar" ? "تم حفظ إعدادات المقرر" : "Course settings saved");
  };

  const standardFields = (d: Draft) => [
    { key: "exam1" as const, value: d.maxExam1, set: (v: number) => updateDraft(openCourseId!, { maxExam1: v }) },
    { key: "exam2" as const, value: d.maxExam2, set: (v: number) => updateDraft(openCourseId!, { maxExam2: v }) },
    { key: "finalExam" as const, value: d.maxFinal, set: (v: number) => updateDraft(openCourseId!, { maxFinal: v }) },
    { key: "participation" as const, value: d.maxParticipation, set: (v: number) => updateDraft(openCourseId!, { maxParticipation: v }) },
    { key: "homework" as const, value: d.maxHomework, set: (v: number) => updateDraft(openCourseId!, { maxHomework: v }) },
    { key: "bonus" as const, value: d.maxBonus, set: (v: number) => updateDraft(openCourseId!, { maxBonus: v }) },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-6 text-right"
      >
        <div className="flex items-center gap-2">
          <Award className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">
            {lang === "ar" ? "إعدادات المقررات" : "Course settings"}
          </h2>
        </div>
        <ChevronDown
          size={18}
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-2 px-4 pb-6 sm:px-6">
          {courses.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {lang === "ar" ? "لا توجد مقررات بعد" : "No courses yet"}
            </p>
          ) : (
            courses.map((course) => {
              const d = drafts[course.id];
              if (!d) return null;
              const expanded = openCourseId === course.id;
              return (
                <div key={course.id} className="rounded-xl border border-border bg-background">
                  <button
                    type="button"
                    onClick={() => setOpenCourseId(expanded ? null : course.id)}
                    className="flex w-full items-center justify-between gap-2 p-4"
                  >
                    <div className="text-right">
                      <p className="font-display text-sm font-bold">{course.name}</p>
                      {course.section && (
                        <p className="text-[11px] text-muted-foreground">{course.section}</p>
                      )}
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {expanded && (
                    <div className="space-y-5 px-4 pb-4">
                      {/* Bonus toggle */}
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="mb-2 flex items-center gap-2">
                          <Award className="text-primary" size={14} />
                          <h5 className="font-display text-xs font-bold">
                            {lang === "ar" ? "البونص (نقاط إضافية)" : "Bonus (extra points)"}
                          </h5>
                        </div>
                        <p className="mb-2 text-[11px] text-muted-foreground">
                          {lang === "ar"
                            ? "عند التعطيل: يختفي جدول البونص من صفحة الحضور ولا يُحتسب في صفحة النتائج."
                            : "When disabled: bonus table is hidden in Attendance and excluded from totals in Results."}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => updateDraft(course.id, { bonusEnabled: true })}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                              d.bonusEnabled
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:bg-muted"
                            }`}
                          >
                            {lang === "ar" ? "مُفعّل" : "Enabled"}
                          </button>
                          <button
                            onClick={() => updateDraft(course.id, { bonusEnabled: false })}
                            className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                              !d.bonusEnabled
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:bg-muted"
                            }`}
                          >
                            {lang === "ar" ? "مُعطّل" : "Disabled"}
                          </button>
                        </div>
                      </div>

                      {/* Max grades */}
                      <div className="rounded-lg border border-border bg-card p-3">
                        <h5 className="mb-1 font-display text-xs font-bold">
                          {lang === "ar" ? "الدرجات القصوى وأسماء المكوّنات" : "Max grades & labels"}
                        </h5>
                        <p className="mb-3 text-[11px] text-muted-foreground">
                          {lang === "ar"
                            ? "عدّل اسم كل مكوّن ودرجته القصوى. اضغط 👁 لإخفائه من صفحتي الدرجات والنتائج."
                            : "Edit each component's name and max. Tap 👁 to hide it from Grades and Results."}
                        </p>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {standardFields(d).map((f) => {
                            const canHide = f.key !== "bonus";
                            const isHidden = canHide && d.hiddenComponents.includes(f.key as StandardComponentKey);
                            const toggleHidden = () => {
                              if (!canHide) return;
                              const key = f.key as StandardComponentKey;
                              const next = isHidden
                                ? d.hiddenComponents.filter((k) => k !== key)
                                : [...d.hiddenComponents, key];
                              updateDraft(course.id, { hiddenComponents: next });
                            };
                            return (
                              <div
                                key={f.key}
                                className={`relative rounded-lg border border-border bg-background p-2 ${isHidden ? "opacity-50" : ""}`}
                              >
                                {canHide && (
                                  <button
                                    type="button"
                                    onClick={toggleHidden}
                                    title={isHidden ? (lang === "ar" ? "إظهار" : "Show") : (lang === "ar" ? "إخفاء" : "Hide")}
                                    className="absolute top-1 left-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                                  >
                                    {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                                  </button>
                                )}
                                <input
                                  type="text"
                                  value={d.labels[f.key]}
                                  onChange={(e) =>
                                    updateDraft(course.id, {
                                      labels: { ...d.labels, [f.key]: e.target.value },
                                    })
                                  }
                                  placeholder={DEFAULT_COMPONENT_LABELS[f.key]}
                                  disabled={isHidden}
                                  className="mb-1 w-full rounded-md border border-input bg-background px-2 py-1 text-center text-xs outline-none focus:border-primary"
                                />
                                <NumberInput
                                  value={f.value}
                                  onChange={f.set}
                                  min={0}
                                  showZero
                                  className="w-full px-2 py-1 text-sm font-bold"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Custom components */}
                      <div className="rounded-lg border border-border bg-card p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <h5 className="font-display text-xs font-bold">
                            {lang === "ar" ? "مكوّنات درجات مخصصة" : "Custom components"}
                          </h5>
                          <span className="text-[10px] text-muted-foreground">
                            {d.customComponents.length}/{MAX_CUSTOM}
                          </span>
                        </div>
                        <p className="mb-3 text-[11px] text-muted-foreground">
                          {lang === "ar"
                            ? "أضف نوع درجة جديد (مثل: تقرير، ميداني، مشروع)."
                            : "Add a new grade type (e.g. report, field work, project)."}
                        </p>
                        <div className="space-y-2">
                          {d.customComponents.map((c) => (
                            <div key={c.key} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2">
                              <input
                                type="text"
                                value={c.label}
                                onChange={(e) => updateCustom(course.id, c.key, { label: e.target.value })}
                                placeholder={lang === "ar" ? "اسم المكوّن" : "Component name"}
                                className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                              />
                              <NumberInput
                                value={c.max}
                                onChange={(v) => updateCustom(course.id, c.key, { max: v })}
                                min={0}
                                showZero
                                className="w-20 px-2 py-1.5 text-sm font-bold"
                              />
                              <button
                                onClick={() => removeCustom(course.id, c.key)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => addCustom(course.id)}
                          disabled={d.customComponents.length >= MAX_CUSTOM}
                          className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                        >
                          <Plus size={14} />
                          {lang === "ar" ? "إضافة مكوّن" : "Add component"}
                        </button>
                      </div>

                      <button
                        onClick={() => saveCourse(course.id)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110"
                      >
                        <Save size={14} />
                        {lang === "ar" ? "حفظ إعدادات المقرر" : "Save course settings"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
