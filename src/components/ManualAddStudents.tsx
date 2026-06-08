import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, X, Plus } from "lucide-react";
import { toast } from "sonner";

interface ManualAddStudentsProps {
  onAdd: (names: string[]) => void;
  variant?: "primary" | "outline";
  label?: string;
}

export default function ManualAddStudents({
  onAdd,
  variant = "outline",
  label = "إضافة يدوية",
}: ManualAddStudentsProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const parsedNames = text
    .split(/\r?\n|,/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0 && n.length <= 100);

  const handleAdd = () => {
    if (parsedNames.length === 0) {
      toast.error("أدخل اسماً واحداً على الأقل");
      return;
    }
    onAdd(parsedNames);
    toast.success(`تمت إضافة ${parsedNames.length} ${parsedNames.length === 1 ? "طالب" : "طالب"}`);
    setText("");
    setOpen(false);
  };

  const triggerClass =
    variant === "primary"
      ? "flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg hover:brightness-110 active:scale-[0.98]"
      : "flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted";

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClass}>
        <UserPlus size={variant === "primary" ? 18 : 13} />
        {label}
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
              dir="rtl"
              className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserPlus size={18} />
                  </div>
                  <h3 className="font-display text-base font-bold">إضافة طلبة يدوياً</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-muted"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="mb-2 text-xs text-muted-foreground">
                اكتب اسم كل طالب في سطر مستقل، أو افصل بينهم بفاصلة.
              </p>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"أحمد محمد\nسارة عبدالله\nخالد العتيبي"}
                rows={7}
                className="w-full resize-none rounded-lg border border-input bg-background p-3 text-sm leading-relaxed outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                autoFocus
              />

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  عدد الأسماء: <strong className="text-foreground">{parsedNames.length}</strong>
                </span>
                {text.length > 0 && (
                  <button
                    onClick={() => setText("")}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    مسح
                  </button>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={parsedNames.length === 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-display text-sm font-semibold text-primary-foreground shadow transition-all hover:brightness-110 disabled:opacity-50"
                >
                  <Plus size={16} />
                  إضافة ({parsedNames.length})
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
