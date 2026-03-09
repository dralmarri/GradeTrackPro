import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = "https://apaakkzasfipuhgkezej.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwYWFra3phc2ZpcHVoZ2tlemVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTQ1MDAsImV4cCI6MjA4ODYzMDUwMH0.placeholder";

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL ?? SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? SUPABASE_PUBLISHABLE_KEY
);
