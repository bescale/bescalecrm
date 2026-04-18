-- Adicionar colunas dedicadas para webhook_url e prompt
ALTER TABLE public.whatsapp_sessions ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE public.whatsapp_sessions ADD COLUMN IF NOT EXISTS prompt TEXT;

-- Migrar dados existentes do JSONB settings para as novas colunas
UPDATE public.whatsapp_sessions
SET webhook_url = settings->>'webhook_url',
    prompt = settings->>'prompt'
WHERE settings IS NOT NULL
  AND (settings->>'webhook_url' IS NOT NULL OR settings->>'prompt' IS NOT NULL);
