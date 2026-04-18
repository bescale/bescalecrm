-- ============================================================
-- Adiciona IDs de pagamento (customer + subscription) retornados
-- pelo webhook de processamento do pagamento.
-- ============================================================

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS customer_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_companies_customer_id
  ON public.companies(customer_id);

CREATE INDEX IF NOT EXISTS idx_companies_subscription_id
  ON public.companies(subscription_id);
