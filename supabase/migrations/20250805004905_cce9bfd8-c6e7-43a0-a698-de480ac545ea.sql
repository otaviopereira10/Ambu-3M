-- Verificar se o bucket existe, se não existir, criar
INSERT INTO storage.buckets (id, name, public) 
VALUES ('request-attachments', 'request-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas para permitir upload e visualização
CREATE POLICY IF NOT EXISTS "Permitir upload de anexos para usuários autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'request-attachments');

CREATE POLICY IF NOT EXISTS "Permitir visualização de anexos para usuários autenticados"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'request-attachments');

CREATE POLICY IF NOT EXISTS "Permitir download de anexos para usuários autenticados"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'request-attachments');