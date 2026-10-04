import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { QuestionBank } from "@/types/questionBank";

// any-typed client: question_banks isn't in the generated types yet
const db = supabase as any;

function rowToBank(row: any): QuestionBank {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
  };
}

// Lists/creates the account's named question banks — independent of any
// single course instance (see Course.bankId). A bank is created once and
// then linked to whichever course row represents "this course, this
// semester", so it's reused instead of rebuilt every term.
export function useQuestionBanks() {
  const { user } = useAuth();
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBanks = useCallback(async () => {
    if (!user) { setBanks([]); setLoading(false); return; }
    const { data, error } = await db
      .from("question_banks").select("*")
      .order("name", { ascending: true });
    if (error) { console.error("Error fetching question banks:", error); setLoading(false); return; }
    setBanks((data || []).map(rowToBank));
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBanks(); }, [fetchBanks]);

  const createBank = useCallback(async (name: string): Promise<string> => {
    if (!user || !name.trim()) return "";
    const { data, error } = await db
      .from("question_banks")
      .insert({ user_id: user.id, name: name.trim() })
      .select().single();
    if (error || !data) { console.error("Error creating question bank:", error); return ""; }
    await fetchBanks();
    return data.id;
  }, [user, fetchBanks]);

  const renameBank = useCallback(async (bankId: string, name: string) => {
    if (!name.trim()) return;
    const { error } = await db
      .from("question_banks")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", bankId);
    if (error) console.error("Error renaming question bank:", error);
    else await fetchBanks();
  }, [fetchBanks]);

  // Deletes the bank's own questions first — question_banks.id is only
  // ON DELETE SET NULL from omr_questions.bank_id (so a bank can be removed
  // without silently cascading into deleting a course's exam questions in
  // the general case), which would otherwise leave its questions orphaned
  // (unreachable through any bank, but still sitting in the table) instead
  // of actually gone. Any course.bank_id pointing here is auto-cleared by
  // its own ON DELETE SET NULL once the bank row itself is removed.
  const deleteBank = useCallback(async (bankId: string) => {
    const { error: qErr } = await db.from("omr_questions").delete().eq("bank_id", bankId);
    if (qErr) { console.error("Error deleting bank's questions:", qErr); return false; }
    const { error } = await db.from("question_banks").delete().eq("id", bankId);
    if (error) { console.error("Error deleting question bank:", error); return false; }
    await fetchBanks();
    return true;
  }, [fetchBanks]);

  return { banks, loading, createBank, renameBank, deleteBank, refetch: fetchBanks };
}
