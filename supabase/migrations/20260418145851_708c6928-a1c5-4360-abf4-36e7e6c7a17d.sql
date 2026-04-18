-- Create audit_log table
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast lookup
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view only their own audit records
CREATE POLICY "Users can view own audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- No one can update or delete (permanent archive). INSERT only by triggers (SECURITY DEFINER).

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.log_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_record_id UUID;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_user_id := COALESCE((OLD.user_id)::UUID, auth.uid());
    v_record_id := OLD.id;
    INSERT INTO public.audit_log (user_id, table_name, record_id, operation, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, v_record_id, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    v_user_id := COALESCE((NEW.user_id)::UUID, auth.uid());
    v_record_id := NEW.id;
    INSERT INTO public.audit_log (user_id, table_name, record_id, operation, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, v_record_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    v_user_id := COALESCE((NEW.user_id)::UUID, auth.uid());
    v_record_id := NEW.id;
    INSERT INTO public.audit_log (user_id, table_name, record_id, operation, old_data, new_data)
    VALUES (v_user_id, TG_TABLE_NAME, v_record_id, 'INSERT', NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach triggers to students and courses
CREATE TRIGGER students_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.log_changes();

CREATE TRIGGER courses_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.log_changes();