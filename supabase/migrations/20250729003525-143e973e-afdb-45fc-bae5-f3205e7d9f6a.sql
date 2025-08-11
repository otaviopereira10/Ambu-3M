-- Fix infinite recursion in users table RLS policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Gestoras can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create new non-recursive policies
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = auth_id);

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = auth_id);

-- Create a security definer function to check if user is gestora
CREATE OR REPLACE FUNCTION public.is_gestora(user_auth_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = user_auth_id 
    AND role = 'gestora'::user_role
  );
$$;

-- Create policy for gestoras using the security definer function
CREATE POLICY "Gestoras can view all users" 
ON public.users 
FOR SELECT 
USING (public.is_gestora(auth.uid()));