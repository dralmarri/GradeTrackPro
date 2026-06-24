import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserMinus, X, Trash2, Search, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { Student } from "@/types/student";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLanguage } from "@/hooks/useLanguage";
import { tf } from "@/lib/translations";

interface ManualDeleteStudentsProps {
  students: Student[];
  onDelete: (studentId: string) => void;
}

export default function ManualDeleteStudents({ students, onDelete }: ManualDeleteStudentsProps) {
  const { t, lang, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [pendingSingle, setPendingSingle] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    return q ? students.filter((s) => s.name.includes(q)) : students;
  }, [students, query]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const allIds = filtered.map((s) => s.id);
    const allSelected = allIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) allIds.forEach((id) => next.delete(id));
      else allIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleBulkDelete = () => {
    selected.forEach((id) => onDelete(id));
    const count = selected.size;
    setSelected(new Set());
    setConfirmBulk(false);
    toast.success(lang === "ar" ? `تم حذف ${count} طالب` : `Deleted ${count} students`);
  };

  const handleSingleDelete = () => {
    if (!pendingSingle) return;
    onDelete(pendingSingle.id);
    setSelected((prev) => { const n = new Set(prev); n.delete(pendingSingle.id); return n; });
    toast.success(tf(t("studentDeleted"), { name: pendingSingle.name }));
    setPendingSingle(null);
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selected.has(s.id));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
      >
        <UserMinus size={13} />
        {t("deleteStudent")}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/30 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              dir={dir}
              className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-card p-6 shadow-2xl"
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <UserMinus size={18} />
                  </div>
                  <h3 className="font-display text-base font-bold">{t("deleteStudent")}</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={t("searchByName")}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background pr-9 pl-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Select all row */}
              {filtered.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="mb-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  {allFilteredSelected
                    ? <CheckSquare size={15} className="text-destructive" />
                    : <Square size={15} />}
                  {lang === "ar"
                    ? (allFilteredSelected ? "إلغاء تحديد الكل" : `تحديد الكل (${filtered.length})`)
                    : (allFilteredSelected ? "Deselect all" : `Select all (${filtered.length})`)}
                </button>
              )}

              {/* List */}
              <div className="-mx-1 flex-1 overflow-y-auto px-1">
                {filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">{t("noStudents")}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {filtered.map((s, idx) => {
                      const isSelected = selected.has(s.id);
                      return (
                        <li
                          key={s.id}
                          onClick={() => toggleOne(s.id)}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors ${
                            isSelected
                              ? "border-destructive/40 bg-destructive/5"
                              : "border-border bg-background hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {isSelected
                              ? <CheckSquare size={15} className="shrink-0 text-destructive" />
                              : <Square size={15} className="shrink-0 text-muted-foreground" />}
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">
                              {idx + 1}
                            </span>
                            <span className="truncate text-sm">{s.name}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPendingSingle(s); }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`${t("delete")} ${s.name}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  {t("close")}
                </button>
                {selected.size > 0 && (
                  <button
                    onClick={() => setConfirmBulk(true)}
                    className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow transition-all hover:brightness-110"
                  >
                    <Trash2 size={14} />
                    {lang === "ar" ? `حذف المحددين (${selected.size})` : `Delete selected (${selected.size})`}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm bulk delete */}
      <ConfirmDialog
        open={confirmBulk}
        onOpenChange={(o) => !o && setConfirmBulk(false)}
        title={lang === "ar" ? "حذف الطلاب المحددين" : "Delete selected students"}
        description={
          lang === "ar"
            ? `سيتم حذف ${selected.size} طالب نهائياً. هذا الإجراء لا يمكن التراجع عنه.`
            : `${selected.size} students will be permanently deleted. This cannot be undone.`
        }
        confirmLabel={t("delete")}
        destructive
        onConfirm={handleBulkDelete}
      />

      {/* Confirm single delete */}
      <ConfirmDialog
        open={!!pendingSingle}
        onOpenChange={(o) => !o && setPendingSingle(null)}
        title={t("confirmDeleteStudent")}
        description={pendingSingle ? tf(t("confirmDeleteStudentDesc"), { name: pendingSingle.name }) : ""}
        confirmLabel={t("delete")}
        destructive
        onConfirm={handleSingleDelete}
      />
    </>
  );
}
