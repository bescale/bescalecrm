-- Business hours table
CREATE TABLE IF NOT EXISTS public.business_hours (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  is_open boolean DEFAULT false,
  open_time time DEFAULT '09:00',
  close_time time DEFAULT '18:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, day_of_week)
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company business hours"
  ON public.business_hours FOR SELECT
  USING (company_id = (SELECT get_user_company_id()));

CREATE POLICY "Users can manage their company business hours"
  ON public.business_hours FOR ALL
  USING (company_id = (SELECT get_user_company_id()));

-- Add media fields to quick_replies
ALTER TABLE public.quick_replies
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS media_type text DEFAULT 'text';
-- media_type: 'text', 'image', 'audio'

-- Add color to tags if not exists
ALTER TABLE public.tags
  ALTER COLUMN color SET DEFAULT '#10b981';

-- Create storage bucket for company assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for company-assets
CREATE POLICY "Public Access for company-assets"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'company-assets' );

CREATE POLICY "Authenticated users can upload to company-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'company-assets' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can update their company-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'company-assets' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Authenticated users can delete from company-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'company-assets' 
    AND auth.role() = 'authenticated'
  );
