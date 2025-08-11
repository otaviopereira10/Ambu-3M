-- Adicionar campo polo na tabela requests
ALTER TABLE public.requests ADD COLUMN polo TEXT;

-- Adicionar campo para anexos (PDF/fotos)
ALTER TABLE public.requests ADD COLUMN attachments TEXT[];

-- Criar bucket para arquivos anexos se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-attachments', 
  'request-attachments', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket de anexos
-- Usuários podem visualizar seus próprios arquivos
CREATE POLICY "Users can view their own request attachments" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'request-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Usuários podem fazer upload de seus próprios arquivos
CREATE POLICY "Users can upload their own request attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'request-attachments' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Gestoras podem visualizar todos os anexos
CREATE POLICY "Gestoras can view all request attachments" 
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