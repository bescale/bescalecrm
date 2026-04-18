CRM multi-tenant com IA - design system e decisões de projeto

## Design System
- Font: Inter (Google Fonts)
- Primary: teal (173 58% 39%)
- Sidebar: dark navy (222 47% 11%)
- Status colors: AI=blue, Human=green, Waiting=yellow, Unassigned=orange, Closed=gray, Queue=purple
- Custom tokens: crm.sidebar.*, crm.status.*, crm.success/warning/info

## Architecture
- AppLayout with sidebar + Outlet pattern
- Pages: Dashboard, Chat, Kanban, Contatos, Agentes, Configuracoes
- Multi-tenant: company_id on all tables, RLS with get_user_company_id()
- Roles: super_admin, admin, agent, viewer (user_roles table, has_role() function)
- Auto-create profile on signup via trigger

## Database Tables
- companies, profiles, user_roles
- whatsapp_sessions, contacts, tags, contact_tags
- conversations, messages
- pipeline_stages, opportunities, opportunity_tags
- ai_agents, quick_replies

## PRD Modules
- M1: Chat Multi-atendente (UI built)
- M2: Agentes de IA (UI built)
- M3: Kanban Oportunidades (UI built)
- M4: Gestão de Contatos (UI built)
- M5: Dashboards (UI built)
- M6: Gestão da Plataforma (pending - needs SuperAdm panel)

## Pending Features
- Authentication & login page
- Real WhatsApp integration (WAHA)
- Drag & drop Kanban
- Contact profile detail view
- SuperAdm panel
- Real-time updates
- Connect pages to Supabase data
