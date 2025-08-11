-- Limpar políticas existentes e recriar corretamente
DROP POLICY IF EXISTS "Permitir upload de anexos para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir visualização de anexos para usuários autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Permitir download de anexos para usuários autenticados" ON storage.objects;

-- Política para permitir upload
CREATE POLICY "request_attachments_upload_policy" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'request-attachments');

-- Política para permitir visualização/download
CREATE POLICY "request_attachments_select_policy" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'request-attachments');