-- ============================================================
-- GradeTrackPro v2 — full database setup (fresh project)
-- Run once in the NEW Supabase project's SQL Editor.
-- Rebuilds the complete schema: courses, students, roles,
-- audit log, admin stats, and the new omr_exams table.
-- ============================================================

-- ---------- 1. courses ----------
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  section text DEFAULT '',
  lecture_count integer DEFAULT 0,
  lectures jsonb DEFAULT '[]'::jsonb,
  max_bonus numeric DEFAULT 3,
  max_exam1 numeric DEFAULT 20,
  max_exam2 numeric DEFAULT 20,
  max_final numeric DEFAULT 40,
  max_participation numeric DEFAULT 10,
  max_homework numeric DEFAULT 10,
  lecture_days jsonb DEFAULT '[]'::jsonb,
  lecture_time text DEFAULT '',
  semester_start text DEFAULT '',
  semester_end text DEFAULT '',
  component_labels jsonb DEFAULT '{}'::jsonb,
  bonus_enabled boolean NOT NULL DEFAULT true,
  custom_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  hidden_components jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses select own" ON public.courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "courses insert own" ON public.courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "courses update own" ON public.courses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "courses delete own" ON public.courses FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS courses_user_idx ON public.courses(user_id);

-- ---------- 2. helper: is_course_owner ----------
CREATE OR REPLACE FUNCTION public.is_course_owner(p_course_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = p_course_id AND user_id = auth.uid()) $$;

REVOKE EXECUTE ON FUNCTION public.is_course_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_course_owner(uuid) TO authenticated;

-- ---------- 3. students ----------
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  lecture_bonus jsonb DEFAULT '[]'::jsonb,
  attendance jsonb DEFAULT '[]'::jsonb,
  exam1 numeric DEFAULT 0,
  exam2 numeric DEFAULT 0,
  final_exam numeric DEFAULT 0,
  participation numeric DEFAULT 0,
  homework numeric DEFAULT 0,
  custom_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students select own" ON public.students FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "students insert own" ON public.students FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.is_course_owner(course_id));
CREATE POLICY "students update own" ON public.students FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "students delete own" ON public.students FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS students_course_idx ON public.students(course_id);
CREATE INDEX IF NOT EXISTS students_user_idx ON public.students(user_id);

-- ---------- 4. roles (admin) ----------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- ---------- 5. audit log ----------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_user_created_idx ON public.audit_log(user_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.log_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_record_id uuid;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_user_id := OLD.user_id; v_record_id := OLD.id;
    INSERT INTO public.audit_log (user_id, table_name, record_id, operation, old_data)
    VALUES (v_user_id, TG_TABLE_NAME, v_record_id, TG_OP, to_jsonb(OLD));
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_user_id := NEW.user_id; v_record_id := NEW.id;
    INSERT INTO public.audit_log (user_id, table_name, record_id, operation, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, v_record_id, TG_OP, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    v_user_id := NEW.user_id; v_record_id := NEW.id;
    INSERT INTO public.audit_log (user_id, table_name, record_id, operation, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, v_record_id, TG_OP, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_changes() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS audit_courses ON public.courses;
CREATE TRIGGER audit_courses
AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

DROP TRIGGER IF EXISTS audit_students ON public.students;
CREATE TRIGGER audit_students
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- ---------- 6. admin stats ----------
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN jsonb_build_object(
    'total_users', (SELECT count(*) FROM auth.users),
    'total_courses', (SELECT count(*) FROM public.courses),
    'total_students', (SELECT count(*) FROM public.students)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_admin_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;

-- ---------- 7. omr_exams (v2 feature) ----------
CREATE TABLE IF NOT EXISTS public.omr_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  question_count integer NOT NULL DEFAULT 20,
  choice_count integer NOT NULL DEFAULT 4,
  target_component text NOT NULL DEFAULT 'exam1',
  max_score numeric NOT NULL DEFAULT 20,
  answer_key jsonb NOT NULL DEFAULT '[]'::jsonb,
  student_id_digits integer NOT NULL DEFAULT 6,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.omr_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own omr exams select"
  ON public.omr_exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own omr exams insert"
  ON public.omr_exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own omr exams update"
  ON public.omr_exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users manage own omr exams delete"
  ON public.omr_exams FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS omr_exams_course_idx ON public.omr_exams(course_id);

-- ============================================================
-- Done. Expected result: "Success. No rows returned"
-- ============================================================
