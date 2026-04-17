-- ============================================================
-- Tabela subscription_links: links de assinatura gerados pelo admin
-- ============================================================

CREATE TABLE public.subscription_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,              -- slug do plano (ex: essential)
  plan_name TEXT NOT NULL,         -- nome legível (ex: Essential)
  plan_price TEXT NOT NULL,        -- preço formatado (ex: R$ 597)
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | expired
  created_by UUID REFERENCES auth.users(id),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

-- Index para busca rápida por token (página pública /assinar/:token)
CREATE INDEX idx_subscription_links_token ON public.subscription_links(token);
CREATE INDEX idx_subscription_links_company ON public.subscription_links(company_id);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.subscription_links ENABLE ROW LEVEL SECURITY;

-- Leitura pública pelo token (página /assinar/:token, sem auth)
CREATE POLICY "Anyone can read link by token"
  ON public.subscription_links FOR SELECT
  USING (true);

-- Super admin pode criar/atualizar/deletar
CREATE POLICY "Super admin manages subscription links"
  ON public.subscription_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- A própria página pública precisa dar UPDATE (aceitar o link) sem auth
CREATE POLICY "Anyone can accept a pending link"
  ON public.subscription_links FOR UPDATE
  USING (status = 'pending')
  WITH CHECK (status = 'accepted');
