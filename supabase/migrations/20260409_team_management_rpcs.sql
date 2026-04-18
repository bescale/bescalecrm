-- =============================================
-- TEAM MANAGEMENT RPCs (SECURITY DEFINER)
-- Bypass RLS so admin users can manage their team
-- =============================================

-- 1) Get all roles for members in the caller's company
CREATE OR REPLACE FUNCTION public.get_company_team_roles()
RETURNS TABLE(user_id UUID, role app_role)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _company_id UUID;
BEGIN
  SELECT p.company_id INTO _company_id
  FROM public.profiles p WHERE p.id = auth.uid();

  IF _company_id IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa vinculada';
  END IF;

  RETURN QUERY
    SELECT ur.user_id, ur.role
    FROM public.user_roles ur
    INNER JOIN public.profiles p ON p.id = ur.user_id
    WHERE p.company_id = _company_id;
END;
$$;

-- 2) Change a team member's role (caller must be admin or super_admin in same company)
CREATE OR REPLACE FUNCTION public.change_member_role(_target_user_id UUID, _new_role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_company_id UUID;
  _target_company_id UUID;
BEGIN
  -- Get caller's company
  SELECT p.company_id INTO _caller_company_id
  FROM public.profiles p WHERE p.id = auth.uid();

  -- Caller must be admin or super_admin
  IF NOT (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem alterar cargos';
  END IF;

  -- Target must be in the same company
  SELECT p.company_id INTO _target_company_id
  FROM public.profiles p WHERE p.id = _target_user_id;

  IF _caller_company_id IS NULL OR _target_company_id IS NULL OR _caller_company_id != _target_company_id THEN
    RAISE EXCEPTION 'Membro não encontrado na sua equipe';
  END IF;

  -- Can't change own role
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode alterar seu próprio cargo';
  END IF;

  -- Delete existing roles and insert the new one
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_user_id, _new_role);
END;
$$;

-- 3) Remove a member from the team (caller must be admin or super_admin in same company)
CREATE OR REPLACE FUNCTION public.remove_team_member(_target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_company_id UUID;
  _target_company_id UUID;
BEGIN
  -- Get caller's company
  SELECT p.company_id INTO _caller_company_id
  FROM public.profiles p WHERE p.id = auth.uid();

  -- Caller must be admin or super_admin
  IF NOT (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Permissão negada: apenas administradores podem remover membros';
  END IF;

  -- Target must be in the same company
  SELECT p.company_id INTO _target_company_id
  FROM public.profiles p WHERE p.id = _target_user_id;

  IF _caller_company_id IS NULL OR _target_company_id IS NULL OR _caller_company_id != _target_company_id THEN
    RAISE EXCEPTION 'Membro não encontrado na sua equipe';
  END IF;

  -- Can't remove yourself
  IF _target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode remover a si mesmo';
  END IF;

  -- Remove role and unlink from company
  DELETE FROM public.user_roles WHERE user_id = _target_user_id;
  UPDATE public.profiles SET company_id = NULL, updated_at = now() WHERE id = _target_user_id;
END;
$$;
