-- Corrigir políticas RLS do storage para request-attachments
DROP POLICY IF EXISTS "Users can view their own request attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own request attachments" ON storage.objects;
DROP POLICY IF EXISTS "Gestoras can view all request attachments" ON storage.objects;

-- Política para usuários verem seus próprios anexos
CREATE POLICY "Users can view own attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'request-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para usuários fazerem upload
CREATE POLICY "Users can upload attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'request-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para gestoras verem todos os anexos
CREATE POLICY "Gestoras can view all attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'request-attachments' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_id = auth.uid() 
    AND role = 'gestora'
  )
);

-- Fazer o bucket público para permitir downloads
UPDATE storage.buckets 
SET public = true 
WHERE id = 'request-attachments';