-- ============================================================
-- RPC activate_subscription: cria/atualiza a empresa do usuário
-- autenticado após pagamento aprovado no checkout e vincula os
-- IDs de customer/subscription retornados pelo webhook.
-- ============================================================

CREATE OR REPLACE FUNCTION public.activate_subscription(
  _plan_id UUID,
  _company_name TEXT,
  _cnpj TEXT,
  _customer_id TEXT,
  _subscription_id TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _company_id UUID;
  _plan_slug TEXT;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT slug INTO _plan_slug FROM public.plans WHERE id = _plan_id;
  IF _plan_slug IS NULL THEN
    RAISE EXCEPTION 'Plan not found for id %', _plan_id;
  END IF;

  SELECT company_id INTO _company_id
  FROM public.profiles
  WHERE id = _user_id;

  IF _company_id IS NULL THEN
    INSERT INTO public.companies (name, cnpj, plan, plan_id, customer_id, subscription_id)
    VALUES (_company_name, _cnpj, _plan_slug, _plan_id, _customer_id, _subscription_id)
    RETURNING id INTO _company_id;

    UPDATE public.profiles
    SET company_id = _company_id, updated_at = now()
    WHERE id = _user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.pipeline_stages (company_id, name, color, position) VALUES
      (_company_id, 'Novo Lead', '#3b82f6', 0),
      (_company_id, 'Qualificado', '#0d9488', 1),
      (_company_id, 'Proposta', '#f59e0b', 2),
      (_company_id, 'Negociação', '#f97316', 3),
      (_company_id, 'Fechado ✓', '#22c55e', 4);
  ELSE
    UPDATE public.companies
    SET plan = _plan_slug,
        plan_id = _plan_id,
        customer_id = _customer_id,
        subscription_id = _subscription_id,
        updated_at = now()
    WHERE id = _company_id;
  END IF;

  RETURN _company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.activate_subscription(UUID, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;
