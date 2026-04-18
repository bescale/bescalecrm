-- =============================================
-- FIX: Profiles RLS was too permissive for super_admin
-- super_admin could see ALL profiles from ALL companies,
-- which caused the "atendente" dropdown to show agents
-- from other tenants.
--
-- New policy: everyone (including super_admin) only sees
-- profiles from their own company + their own profile.
-- Super_admin retains full visibility via SECURITY DEFINER RPC.
-- =============================================

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Users see company profiles" ON public.profiles;

-- New policy: strict tenant isolation for profile SELECT
CREATE POLICY "Users see company profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company_id()
    OR id = auth.uid()
  );

-- RPC for admin panel: fetch profiles for a specific company (super_admin only)
CREATE OR REPLACE FUNCTION public.get_company_profiles(_company_id UUID)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super_admin can call this for arbitrary companies
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Permissão negada: apenas super_admin pode listar perfis de outras empresas';
  END IF;

  RETURN QUERY
    SELECT p.id, p.full_name, p.email, p.avatar_url, p.phone, p.is_active, p.created_at
    FROM public.profiles p
    WHERE p.company_id = _company_id
    ORDER BY p.created_at ASC;
END;
$$;
