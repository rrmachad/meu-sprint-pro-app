
-- Bucket para arquivos de criativos e entregáveis
INSERT INTO storage.buckets (id, name, public)
VALUES ('arquivos', 'arquivos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'arquivos');

-- RLS: qualquer um pode ver (bucket público)
CREATE POLICY "Public read access for arquivos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'arquivos');

-- RLS: usuários podem atualizar seus próprios arquivos
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'arquivos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'arquivos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- RLS: usuários podem deletar seus próprios arquivos
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'arquivos' AND (storage.foldername(name))[1] = auth.uid()::text);
