import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserMinus, X, Trash2, Search } from "lucide-react";
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
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim();
    return q ? students.filter((s) => s.name.includes(q)) : students;
  }, [students, query]);

  const handleConfirm = () => {
    if (!pending) return;
    onDelete(pending.id);
    toast.success(tf(t("studentDeleted"), { name: pending.name }));
    setPending(null);
  };

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

              <div className="-mx-1 flex-1 overflow-y-auto px-1">
                {filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {t("noStudents")}
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {filtered.map((s, idx) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-bold text-secondary-foreground">
                            {idx + 1}
                          </span>
                          <span className="truncate text-sm">{s.name}</span>
                        </div>
                        <button
                          onClick={() => setPending(s)}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`${t("delete")} ${s.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  {t("close")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
        title={t("confirmDeleteStudent")}
        description={pending ? tf(t("confirmDeleteStudentDesc"), { name: pending.name }) : ""}
        confirmLabel={t("delete")}
        destructive
        onConfirm={handleConfirm}
      />
    </>
  );
}
