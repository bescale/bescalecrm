-- Add audio/webm mime type to chat-media bucket (used by AudioRecorder in browser)
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'audio/webm')
WHERE id = 'chat-media'
  AND NOT ('audio/webm' = ANY(allowed_mime_types));
