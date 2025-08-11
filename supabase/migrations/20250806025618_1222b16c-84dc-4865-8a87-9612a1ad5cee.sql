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