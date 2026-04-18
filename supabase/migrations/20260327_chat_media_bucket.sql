-- Create storage bucket for chat media (WhatsApp images, audio, video, documents)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'audio/ogg','audio/mpeg','audio/mp4','audio/amr',
    'video/mp4','video/3gpp',
    'application/pdf','application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip','text/plain',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public read chat-media" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'chat-media');

-- Service role can insert (used by edge functions)
CREATE POLICY "Service insert chat-media" ON storage.objects
  FOR INSERT TO service_role
  WITH CHECK (bucket_id = 'chat-media');
