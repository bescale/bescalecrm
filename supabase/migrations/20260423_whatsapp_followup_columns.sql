-- Follow-up controls per WhatsApp instance
ALTER TABLE public.whatsapp_sessions ADD COLUMN IF NOT EXISTS followup_2h  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.whatsapp_sessions ADD COLUMN IF NOT EXISTS followup_1d  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.whatsapp_sessions ADD COLUMN IF NOT EXISTS followup_2d  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.whatsapp_sessions ADD COLUMN IF NOT EXISTS followup_3d  BOOLEAN NOT NULL DEFAULT false;
