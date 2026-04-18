-- ============================================================
-- RPC: aceitar link de assinatura (SECURITY DEFINER - bypass RLS)
-- Pode ser chamada sem auth pela página pública /assinar/:token
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_subscription_link(_link_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _link RECORD;
  _plan_row RECORD;
BEGIN
  -- 1. Buscar o link
  SELECT * INTO _link
  FROM public.subscription_links
  WHERE id = _link_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Link não encontrado');
  END IF;

  -- 2. Validar status
  IF _link.status = 'accepted' THEN
    RETURN json_build_object('success', false, 'error', 'Link já foi utilizado');
  END IF;

  IF _link.status = 'expired' OR _link.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Link expirado');
  END IF;

  -- 3. Resolver UUID do plano pelo slug
  SELECT * INTO _plan_row
  FROM public.plans
  WHERE slug = _link.plan;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Plano não encontrado');
  END IF;

  -- 4. Aceitar o link
  UPDATE public.subscription_links
  SET status = 'accepted', signed_at = now()
  WHERE id = _link_id;

  -- 5. Atualizar plano da empresa
  UPDATE public.companies
  SET plan = _link.plan,
      plan_id = _plan_row.id
  WHERE id = _link.company_id;

  RETURN json_build_object('success', true);
END;
$$;
