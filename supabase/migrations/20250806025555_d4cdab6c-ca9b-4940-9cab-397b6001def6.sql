-- Segunda parte: Criar tabela para permissões de polo dos usuários
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

-- Políticas para user_polo_permissions
CREATE POLICY "Admins podem gerenciar todas as permissões" 
ON user_polo_permissions 
FOR ALL 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

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