-- Habilitar Realtime nas tabelas que ainda nao estao na publicacao
-- (messages e conversations ja foram adicionadas em 20260326_enable_realtime.sql)
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.opportunities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
