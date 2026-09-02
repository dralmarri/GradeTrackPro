REVOKE EXECUTE ON FUNCTION public.log_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_course_owner(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_course_owner(uuid) TO authenticated;