import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Keep the UI previewable when this repository is opened without its original
// Supabase environment. Real deployments still use the configured project.
export const supabase = createClient<Database>(
  SUPABASE_URL || "https://demo.gradetrackpro.invalid",
  SUPABASE_ANON_KEY || "demo-anon-key",
  {
    auth: {
      persistSession: isSupabaseConfigured,
      autoRefreshToken: isSupabaseConfigured,
    },
  },
);
