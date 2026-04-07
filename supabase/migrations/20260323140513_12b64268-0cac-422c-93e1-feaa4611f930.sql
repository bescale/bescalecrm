
-- Add invite_code to companies for join-by-code flow
ALTER TABLE public.companies ADD COLUMN invite_code TEXT UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8);

-- Allow inserting companies (for signup flow, user creates company)
CREATE POLICY "Authenticated users can create companies" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow inserting profiles (trigger creates, but user may update company_id)
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- Function to join a company by invite code
CREATE OR REPLACE FUNCTION public.join_company_by_invite_code(_invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
BEGIN
  SELECT id INTO _company_id FROM public.companies WHERE invite_code = _invite_code AND is_active = true;
  IF _company_id IS NULL THEN
    RAISE EXCEPTION 'Código de convite inválido';
  END IF;
  UPDATE public.profiles SET company_id = _company_id, updated_at = now() WHERE id = auth.uid();
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'agent') ON CONFLICT DO NOTHING;
  RETURN _company_id;
END;
$$;

-- Function to create company and assign admin role
CREATE OR REPLACE FUNCTION public.create_company_and_assign(_name TEXT, _cnpj TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
BEGIN
  INSERT INTO public.companies (name, cnpj) VALUES (_name, _cnpj) RETURNING id INTO _company_id;
  UPDATE public.profiles SET company_id = _company_id, updated_at = now() WHERE id = auth.uid();
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin') ON CONFLICT DO NOTHING;
  
  -- Create default pipeline stages
  INSERT INTO public.pipeline_stages (company_id, name, color, position) VALUES
    (_company_id, 'Novo Lead', '#3b82f6', 0),
    (_company_id, 'Qualificado', '#0d9488', 1),
    (_company_id, 'Proposta', '#f59e0b', 2),
    (_company_id, 'Negociação', '#f97316', 3),
    (_company_id, 'Fechado ✓', '#22c55e', 4);
  
  RETURN _company_id;
END;
$$;
