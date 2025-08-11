-- Fix security definer function to include search_path
CREATE OR REPLACE FUNCTION public.is_gestora(user_auth_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = user_auth_id 
    AND role = 'gestora'::user_role
  );
$$;