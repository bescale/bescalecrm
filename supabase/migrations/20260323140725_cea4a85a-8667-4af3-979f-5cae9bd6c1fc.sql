
-- Fix: The create_company_and_assign function uses SECURITY DEFINER so it bypasses RLS.
-- Remove the overly permissive insert policy on companies.
DROP POLICY "Authenticated users can create companies" ON public.companies;
