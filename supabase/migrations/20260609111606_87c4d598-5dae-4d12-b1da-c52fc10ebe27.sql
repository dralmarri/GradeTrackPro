
-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Grants
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 4. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 6. RLS policies
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Assign admin to dralmarri@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('3b96adab-1ec7-4106-800a-4cdf8acd632c', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 8. Admin stats function (bypasses RLS to count all data)
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM auth.users),
    'total_courses', (SELECT COUNT(*) FROM public.courses),
    'total_students', (SELECT COUNT(*) FROM public.students),
    'new_users_week', (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '7 days'),
    'new_users_today', (SELECT COUNT(*) FROM auth.users WHERE created_at > now() - interval '1 day'),
    'recent_users', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'email', email,
        'created_at', created_at,
        'last_sign_in_at', last_sign_in_at
      ) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT email, created_at, last_sign_in_at FROM auth.users ORDER BY created_at DESC LIMIT 20) u
    )
  ) INTO result;

  RETURN result;
END;
$$;
