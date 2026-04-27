-- Adiciona coluna para o link externo de assinatura (Asaas / provedor externo)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS subscription_link TEXT;
