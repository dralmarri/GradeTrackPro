
-- Attach audit triggers to courses and students for permanent change tracking
DROP TRIGGER IF EXISTS audit_courses ON public.courses;
CREATE TRIGGER audit_courses
AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

DROP TRIGGER IF EXISTS audit_students ON public.students;
CREATE TRIGGER audit_students
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

-- Helpful index for fast retrieval
CREATE INDEX IF NOT EXISTS audit_log_user_created_idx
ON public.audit_log(user_id, created_at DESC);
