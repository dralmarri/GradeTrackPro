// The answer-sheet header (institution/college/department/logo) used to
// live in localStorage — saved per-device, so signing in on a second
// device meant retyping it. This ties it to the professor's account
// instead: enter it once, it follows them anywhere, and they can still
// change it whenever they want (see OmrExamsPage's header-settings form).
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// any-typed client: sheet_header_settings isn't in the generated types yet
const db = supabase as any;

export interface SheetHeaderSettings {
  institution: string;
  college: string;
  department: string;
  logo: string;
}

const EMPTY: SheetHeaderSettings = { institution: "", college: "", department: "", logo: "" };
const LOCAL_KEYS = {
  institution: "gtp_institution", college: "gtp_college", department: "gtp_department", logo: "gtp_logo",
} as const;

function readLocalFallback(): SheetHeaderSettings {
  return {
    institution: localStorage.getItem(LOCAL_KEYS.institution) || "",
    college: localStorage.getItem(LOCAL_KEYS.college) || "",
    department: localStorage.getItem(LOCAL_KEYS.department) || "",
    logo: localStorage.getItem(LOCAL_KEYS.logo) || "",
  };
}

export function useSheetHeaderSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SheetHeaderSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const migratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) { setSettings(EMPTY); setLoading(false); return; }
      setLoading(true);
      const { data, error } = await db
        .from("sheet_header_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (error) {
        // table not migrated on this database yet (or another DB hiccup) —
        // fall back to whatever this device had saved before, instead of
        // losing it or crashing the page
        setSettings(readLocalFallback());
        setLoading(false);
        return;
      }
      if (data) {
        setSettings({
          institution: data.institution || "",
          college: data.college || "",
          department: data.department || "",
          logo: data.logo_data_url || "",
        });
      } else {
        // first time this account has saved a header — carry over anything
        // already entered on this device once, so nothing is lost
        const local = readLocalFallback();
        setSettings(local);
        if (!migratedRef.current && (local.institution || local.college || local.department || local.logo)) {
          migratedRef.current = true;
          await db.from("sheet_header_settings").upsert({
            user_id: user.id,
            institution: local.institution || null,
            college: local.college || null,
            department: local.department || null,
            logo_data_url: local.logo || null,
          });
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const update = useCallback(async (patch: Partial<SheetHeaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    if (!user) return;
    const row: Record<string, unknown> = { user_id: user.id };
    if (patch.institution !== undefined) row.institution = patch.institution || null;
    if (patch.college !== undefined) row.college = patch.college || null;
    if (patch.department !== undefined) row.department = patch.department || null;
    if (patch.logo !== undefined) row.logo_data_url = patch.logo || null;
    const { error } = await db.from("sheet_header_settings").upsert(row);
    if (error) console.error("Error saving sheet header settings:", error);
  }, [user]);

  return { ...settings, loading, update };
}
