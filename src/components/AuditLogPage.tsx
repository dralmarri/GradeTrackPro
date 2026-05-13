import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { History, Loader2, Plus, Pencil, Trash2 } from "lucide-react";

const db = supabase as any;

interface AuditRow {
  id: string;
  table_name: string;
  record_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  old_data: any;
  new_data: any;
  created_at: string;
}

const TABLE_AR: Record<string, string> = {
  courses: "مادة",
  students: "طالب",
};

const OP_AR: Record<string, string> = {
  INSERT: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
};

function describeChange(row: AuditRow): string {
  const tbl = TABLE_AR[row.table_name] || row.table_name;
  if (row.operation === "INSERT") {
    const name = row.new_data?.name || "";
    return `${tbl}: ${name}`;
  }
  if (row.operation === "DELETE") {
    const name = row.old_data?.name || "";
    return `${tbl}: ${name}`;
  }
  // UPDATE — show changed fields
  const changes: string[] = [];
  const fields: Record<string, string> = {
    name: "الاسم",
    exam1: "اختبار١",
    exam2: "اختبار٢",
    final_exam: "النهائي",
    participation: "المشاركة",
    homework: "الواجب",
    attendance: "الحضور",
    lecture_bonus: "البونص",
    max_exam1: "حد اختبار١",
    max_exam2: "حد اختبار٢",
    max_final: "حد النهائي",
    max_participation: "حد المشاركة",
    max_homework: "حد الواجب",
    max_bonus: "حد البونص/محاضرة",
    lecture_count: "عدد المحاضرات",
    lectures: "المحاضرات",
    section: "الشعبة",
  };
  for (const k of Object.keys(fields)) {
    const a = row.old_data?.[k];
    const b = row.new_data?.[k];
    const ja = JSON.stringify(a);
    const jb = JSON.stringify(b);
    if (ja !== jb) {
      if (typeof a === "object" || typeof b === "object") {
        changes.push(fields[k]);
      } else {
        changes.push(`${fields[k]}: ${a ?? "—"} → ${b ?? "—"}`);
      }
    }
  }
  const name = row.new_data?.name || row.old_data?.name || "";
  return `${tbl} (${name}) — ${changes.join("، ") || "تحديث"}`;
}

export default function AuditLogPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "INSERT" | "UPDATE" | "DELETE">("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await db
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (!error) setRows((data || []) as AuditRow[]);
      setLoading(false);
    })();
  }, [user]);

  const filtered = filter === "all" ? rows : rows.filter((r) => r.operation === filter);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <History className="text-primary" size={20} />
          <h2 className="font-display text-lg font-bold">سجل المراجعة</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          يُسجَّل كل تغيير على المقررات والطلبة تلقائياً ويُحفظ بشكل دائم.
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          {([
            ["all", "الكل"],
            ["INSERT", "إضافات"],
            ["UPDATE", "تعديلات"],
            ["DELETE", "حذف"],
          ] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k as any)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === k
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">لا توجد سجلات</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((r) => (
              <li key={r.id} className="flex items-start gap-3 py-3">
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    r.operation === "INSERT"
                      ? "bg-green-500/10 text-green-600"
                      : r.operation === "UPDATE"
                      ? "bg-blue-500/10 text-blue-600"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {r.operation === "INSERT" ? (
                    <Plus size={14} />
                  ) : r.operation === "UPDATE" ? (
                    <Pencil size={14} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground break-words">
                    <span className="font-semibold">{OP_AR[r.operation]}</span>{" — "}
                    {describeChange(r)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {format(new Date(r.created_at), "yyyy/MM/dd HH:mm:ss")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
