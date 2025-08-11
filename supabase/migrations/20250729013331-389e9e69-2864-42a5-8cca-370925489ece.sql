-- Remove todas as policies problemáticas da tabela users e recria corretamente
DROP POLICY IF EXISTS "Gestoras can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Recria as policies sem recursão usando a função is_gestora existente
CREATE POLICY "Enable users to view their own profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = auth_id);

CREATE POLICY "Enable gestoras to view all users" 
ON public.users 
FOR SELECT 
USING (public.is_gestora(auth.uid()));

CREATE POLICY "Enable users to update own profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = auth_id);