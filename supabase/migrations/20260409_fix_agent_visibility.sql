-- =============================================
-- FIX: Agent users can't see company/whatsapp/team data
-- Root causes:
--   1) handle_new_user trigger ignores invite metadata (company_id, role)
--   2) No UPDATE policy on companies for admin users
--   3) Existing invited users may have NULL company_id
-- =============================================

-- 1. Update handle_new_user trigger to set company_id and role from invite metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite_company_id UUID;
  _invite_role TEXT;
BEGIN
  _invite_company_id := (NEW.raw_user_meta_data->>'invite_company_id')::UUID;
  _invite_role := NEW.raw_user_meta_data->>'invite_role';

  INSERT INTO public.profiles (id, full_name, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    _invite_company_id
  );

  -- If invited with a role, assign it automatically
  IF _invite_role IS NOT NULL AND _invite_company_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _invite_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Fix existing profiles: set company_id from invite metadata where missing
UPDATE public.profiles p
SET company_id = (au.raw_user_meta_data->>'invite_company_id')::UUID
FROM auth.users au
WHERE p.id = au.id
  AND p.company_id IS NULL
  AND au.raw_user_meta_data->>'invite_company_id' IS NOT NULL;

-- 3. Fix existing users: insert missing role from invite metadata
INSERT INTO public.user_roles (user_id, role)
SELECT au.id, (au.raw_user_meta_data->>'invite_role')::app_role
FROM auth.users au
WHERE au.raw_user_meta_data->>'invite_role' IS NOT NULL
  AND au.raw_user_meta_data->>'invite_company_id' IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Allow admin users to update their own company data (ConfigEmpresa)
CREATE POLICY "Admin updates own company" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    id = public.get_user_company_id()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
    )
  )
  WITH CHECK (
    id = public.get_user_company_id()
  );
