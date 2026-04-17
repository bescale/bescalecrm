-- ============================================================
-- Migration v2: Recriar plans com UUID e vincular a companies
-- ============================================================

-- 1. Limpar a versão anterior (se existir)
DROP FUNCTION IF EXISTS public.get_company_plan_limits(UUID);
DROP POLICY IF EXISTS "Plans are readable by everyone" ON public.plans;
DROP POLICY IF EXISTS "Plans are manageable by super_admin" ON public.plans;
ALTER TABLE public.companies DROP COLUMN IF EXISTS plan_id;
DROP TABLE IF EXISTS public.plans;

-- 2. Criar tabela plans com UUID
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,               -- identificador legível (free, essential, etc.)
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  price_label TEXT NOT NULL DEFAULT 'R$ 0',
  max_whatsapp_sessions INTEGER NOT NULL DEFAULT 1,
  max_users INTEGER NOT NULL DEFAULT 2,
  max_agents INTEGER NOT NULL DEFAULT 0,
  max_contacts INTEGER NOT NULL DEFAULT 100,
  ai_enabled BOOLEAN NOT NULL DEFAULT false,
  priority_support BOOLEAN NOT NULL DEFAULT false,
  custom_branding BOOLEAN NOT NULL DEFAULT false,
  api_access BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Seed dos planos
INSERT INTO public.plans (slug, name, description, price, price_label, max_whatsapp_sessions, max_users, max_agents, max_contacts, ai_enabled, priority_support, custom_branding, api_access, sort_order)
VALUES
  ('free',       'Gratuito',   'Plano gratuito para testes iniciais.', 0, 'R$ 0', 1, 2, 0, 100, false, false, false, false, 0),
  ('essential',  'Essential',  'Para empresas que querem começar a automatizar o atendimento comercial e não perder oportunidades.', 597, 'R$ 597', 1, 3, 1, 1000, true, false, false, false, 1),
  ('advanced',   'Advanced',   'Para empresas que querem acelerar a conversão, retomar leads inativos e integrar o comercial de ponta a ponta.', 1497, 'R$ 1.497', 2, 5, 3, 5000, true, true, true, false, 2),
  ('enterprise', 'Enterprise', 'Para empresas que precisam de acompanhamento humano contínuo e alto nível de confiabilidade.', 0, 'Sob consulta', -1, -1, -1, -1, true, true, true, true, 3);

-- 4. Adicionar plan_id UUID em companies com FK
ALTER TABLE public.companies
  ADD COLUMN plan_id UUID REFERENCES public.plans(id);

-- 5. Sincronizar: mapear o campo text "plan" para o UUID correto
UPDATE public.companies c
SET plan_id = p.id
FROM public.plans p
WHERE p.slug = c.plan;

-- 6. Empresas sem match → plano free
UPDATE public.companies c
SET plan_id = (SELECT id FROM public.plans WHERE slug = 'free')
WHERE c.plan_id IS NULL;

-- 7. RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are readable by everyone"
  ON public.plans FOR SELECT
  USING (true);

CREATE POLICY "Plans are manageable by super_admin"
  ON public.plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'super_admin'
    )
  );

-- 8. Function utilitária
CREATE OR REPLACE FUNCTION public.get_company_plan_limits(_company_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT row_to_json(p)
  FROM public.plans p
  JOIN public.companies c ON c.plan_id = p.id
  WHERE c.id = _company_id;
$$;
