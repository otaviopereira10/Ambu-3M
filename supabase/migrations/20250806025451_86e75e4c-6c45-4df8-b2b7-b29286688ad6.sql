-- Adicionar o role 'admin' ao enum user_role
ALTER TYPE user_role ADD VALUE 'admin';

-- Criar tabela para permissões de polo dos usuários
CREATE TABLE public.user_polo_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  polo polo_type NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, polo)
);

-- Habilitar RLS na nova tabela
ALTER TABLE user_polo_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para user_polo_permissions
CREATE POLICY "Admins podem gerenciar todas as permissões" 
ON user_polo_permissions 
FOR ALL 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_id = auth.uid() 
  AND role = 'admin'::user_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users 
  WHERE auth_id = auth.uid() 
  AND role = 'admin'::user_role
));

CREATE POLICY "Usuários podem ver suas próprias permissões" 
ON user_polo_permissions 
FOR SELECT 
TO authenticated
USING (user_id IN (
  SELECT id FROM users 
  WHERE auth_id = auth.uid()
));

-- Migrar dados existentes: cada usuário com polo definido ganha permissão para esse polo
INSERT INTO user_polo_permissions (user_id, polo, granted_by)
SELECT 
  id, 
  polo, 
  (SELECT id FROM users WHERE role = 'admin'::user_role LIMIT 1)
FROM users 
WHERE polo IS NOT NULL;

-- Atualizar políticas existentes para incluir admins
DROP POLICY IF EXISTS "Gestoras can view all requests" ON requests;
CREATE POLICY "Gestoras e admins podem ver requests" 
ON requests 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND role IN ('gestora'::user_role, 'admin'::user_role)
  )
);

DROP POLICY IF EXISTS "Gestoras can update requests" ON requests;
CREATE POLICY "Gestoras e admins podem atualizar requests" 
ON requests 
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND role IN ('gestora'::user_role, 'admin'::user_role)
  )
);

-- Função para verificar se usuário é admin
CREATE OR REPLACE FUNCTION public.is_admin(user_auth_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = user_auth_id 
    AND role = 'admin'::user_role
  );
$function$;

-- Política para admins verem todos os usuários
CREATE POLICY "Admins podem ver todos os usuários" 
ON users 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- Política para admins atualizarem usuários
CREATE POLICY "Admins podem atualizar usuários" 
ON users 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()));