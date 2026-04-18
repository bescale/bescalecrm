-- Habilitar Realtime nas tabelas de chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Indices para lookup rapido no webhook
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON public.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_waha_instance ON public.whatsapp_sessions(waha_instance_id);
