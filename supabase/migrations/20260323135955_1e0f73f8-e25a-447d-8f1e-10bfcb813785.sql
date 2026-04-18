
-- =============================================
-- NexoCRM Multi-Tenant Database Schema
-- =============================================

-- 1. COMPANIES (Tenants)
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USER ROLES ENUM
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'agent', 'viewer');

-- 3. USER ROLES TABLE
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. PROFILES (users linked to companies)
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. WHATSAPP SESSIONS (per company)
CREATE TABLE public.whatsapp_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  waha_instance_id TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. TAGS (per company)
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

-- 7. CONTACTS (per company)
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company_name TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  origin TEXT,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. CONTACT_TAGS (junction)
CREATE TABLE public.contact_tags (
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, tag_id)
);

-- 9. CONVERSATIONS (per company)
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'unassigned',
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. MESSAGES
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'lead',
  sender_id UUID,
  content TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. PIPELINE STAGES (per company)
CREATE TABLE public.pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3b82f6',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. OPPORTUNITIES (per company)
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(15,2) NOT NULL DEFAULT 0,
  probability INTEGER NOT NULL DEFAULT 0,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expected_close_date DATE,
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. OPPORTUNITY_TAGS (junction)
CREATE TABLE public.opportunity_tags (
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, tag_id)
);

-- 14. AI AGENTS (per company)
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  model TEXT DEFAULT 'gpt-4o-mini',
  status TEXT NOT NULL DEFAULT 'inactive',
  schedule JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  total_conversations INTEGER NOT NULL DEFAULT 0,
  total_qualified INTEGER NOT NULL DEFAULT 0,
  avg_response_time NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. QUICK REPLIES (per company)
CREATE TABLE public.quick_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  shortcut TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SECURITY DEFINER FUNCTIONS
-- =============================================

-- Function to get current user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Function to check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- ENABLE RLS ON ALL TABLES
-- =============================================
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - Tenant Isolation
-- =============================================

-- COMPANIES: users see only their own company; super_admin sees all
CREATE POLICY "Users see own company" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_user_company_id() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin manages companies" ON public.companies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- PROFILES: users see profiles in same company
CREATE POLICY "Users see company profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company_id() OR id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- USER ROLES: only super_admin manages
CREATE POLICY "Super admin manages roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- TENANT-SCOPED TABLES (same pattern)
-- WhatsApp Sessions
CREATE POLICY "Tenant isolation" ON public.whatsapp_sessions
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id());

-- Tags
CREATE POLICY "Tenant isolation" ON public.tags
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id());

-- Contacts
CREATE POLICY "Tenant isolation" ON public.contacts
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id());

-- Contact Tags
CREATE POLICY "Tenant isolation" ON public.contact_tags
  FOR ALL TO authenticated
  USING (
    contact_id IN (SELECT id FROM public.contacts WHERE company_id = public.get_user_company_id())
  );

-- Conversations
CREATE POLICY "Tenant isolation" ON public.conversations
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id());

-- Messages (via conversation tenant check)
CREATE POLICY "Tenant isolation" ON public.messages
  FOR ALL TO authenticated
  USING (
    conversation_id IN (SELECT id FROM public.conversations WHERE company_id = public.get_user_company_id())
  );

-- Pipeline Stages
CREATE POLICY "Tenant isolation" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id());

-- Opportunities
CREATE POLICY "Tenant isolation" ON public.opportunities
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id());

-- Opportunity Tags
CREATE POLICY "Tenant isolation" ON public.opportunity_tags
  FOR ALL TO authenticated
  USING (
    opportunity_id IN (SELECT id FROM public.opportunities WHERE company_id = public.get_user_company_id())
  );

-- AI Agents
CREATE POLICY "Tenant isolation" ON public.ai_agents
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id());

-- Quick Replies
CREATE POLICY "Tenant isolation" ON public.quick_replies
  FOR ALL TO authenticated
  USING (company_id = public.get_user_company_id());

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_profiles_company ON public.profiles(company_id);
CREATE INDEX idx_contacts_company ON public.contacts(company_id);
CREATE INDEX idx_conversations_company ON public.conversations(company_id);
CREATE INDEX idx_conversations_contact ON public.conversations(contact_id);
CREATE INDEX idx_conversations_assigned ON public.conversations(assigned_to);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
CREATE INDEX idx_opportunities_company ON public.opportunities(company_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage_id);
CREATE INDEX idx_ai_agents_company ON public.ai_agents(company_id);
CREATE INDEX idx_whatsapp_sessions_company ON public.whatsapp_sessions(company_id);
