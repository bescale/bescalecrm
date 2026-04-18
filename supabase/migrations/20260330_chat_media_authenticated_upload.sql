-- Allow authenticated users to upload files to chat-media bucket (frontend uploads)
CREATE POLICY "Authenticated insert chat-media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-media');

-- Allow authenticated users to update their uploads (e.g. upsert)
CREATE POLICY "Authenticated update chat-media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-media');
