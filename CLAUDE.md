# CLAUDE.md - NexoCRM (Project Canvas)

## Visao Geral do Projeto

CRM multi-tenant com integracao WhatsApp, construido em React + TypeScript + Supabase.
Gerencia conversas, leads, contatos, agentes e funil de vendas.

## Stack Tecnologico

- **Frontend:** React 18, TypeScript 5.8, Vite 5
- **Estilizacao:** Tailwind CSS 3.4, shadcn/ui (Radix UI), Lucide icons
- **Estado/Dados:** TanStack React Query, React Hook Form + Zod
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Graficos:** Recharts
- **Testes:** Vitest (unit), Playwright (E2E), Testing Library

## Comandos Essenciais

```bash
npm run dev          # Dev server (porta 8080)
npm run build        # Build producao
npm run build:dev    # Build modo development
npm run lint         # ESLint
npm test             # Testes unitarios (single run)
npm run test:watch   # Testes em watch mode
npm run preview      # Preview do build
```

## Estrutura do Projeto

```
src/
├── components/
│   ├── ui/              # Componentes shadcn/ui (nao editar diretamente)
│   ├── AppLayout.tsx    # Layout principal (sidebar + content)
│   ├── NavLink.tsx      # Links de navegacao
│   └── ProtectedRoute.tsx # Protecao de rotas autenticadas
├── contexts/
│   └── AuthContext.tsx  # Auth com Supabase (session, profile, company_id)
├── hooks/
│   ├── use-mobile.tsx   # Deteccao mobile
│   └── use-toast.ts     # Notificacoes toast
├── integrations/
│   └── supabase/
│       ├── client.ts    # Cliente Supabase inicializado
│       └── types.ts     # Tipos auto-gerados do banco
├── lib/
│   └── utils.ts         # cn() e utilidades
├── pages/
│   ├── Dashboard.tsx    # KPIs, graficos, performance de agentes
│   ├── Chat.tsx         # Interface de conversas WhatsApp
│   ├── Kanban.tsx       # Board de pipeline
│   ├── Contatos.tsx     # Gestao de contatos
│   ├── Agentes.tsx      # Gestao de agentes/equipe
│   ├── Configuracoes.tsx # Configuracoes
│   ├── Login.tsx        # Autenticacao
│   ├── Signup.tsx       # Cadastro
│   ├── Onboarding.tsx   # Fluxo de onboarding
│   └── ...
├── test/
│   └── setup.ts         # Configuracao Vitest (jest-dom, matchMedia)
├── App.tsx              # Router + providers (QueryClient, Auth, Toast)
├── index.css            # Tailwind directives + CSS variables (HSL)
└── main.tsx             # Entry point
supabase/
├── config.toml          # Config do projeto Supabase
└── migrations/          # Migrations SQL do banco
```

## Arquitetura e Padroes

### Roteamento
- **Rotas publicas:** /login, /signup, /forgot-password, /reset-password, /onboarding
- **Rotas protegidas** (via `ProtectedRoute`): /, /chat, /kanban, /contatos, /agentes, /configuracoes

### Autenticacao
- Supabase Auth com session management
- `AuthContext` fornece: user, session, profile (full_name, avatar_url, phone, company_id)
- Multi-tenant: cada usuario pertence a uma `company_id`

### Banco de Dados (Multi-tenant)
Tabelas principais:
- `companies` - Tenants (CNPJ, logo, plano, settings JSONB)
- `profiles` - Usuarios vinculados a companies
- `user_roles` - RBAC (super_admin, admin, agent, viewer)
- `contacts` - Contatos com score e custom_fields JSONB
- `conversations` - Status: unassigned, ai, human, waiting, closed, queue
- `messages` - Historico de mensagens
- `whatsapp_sessions` - Sessoes WhatsApp por company
- `tags` / `contact_tags` - Sistema de tags

### Componentes UI
- Usar componentes de `src/components/ui/` (shadcn/ui)
- Adicionar novos via `npx shadcn@latest add <component>`
- Nao editar arquivos em `ui/` diretamente - customizar via Tailwind config

### Estilizacao
- CSS variables em HSL definidas em `index.css` (light/dark mode)
- Cores de status customizadas: `--ai`, `--human`, `--waiting`, `--unassigned`, `--closed`, `--queue`
- Dark mode via classe `.dark`
- Fonte padrao: Inter

## Convencoes de Codigo

- **Path alias:** `@/` mapeia para `src/`
- **Idioma do codigo:** Nomes de paginas e rotas em portugues (Contatos, Agentes, Configuracoes)
- **TypeScript:** Modo nao-strict (noImplicitAny: false). Tipos do Supabase auto-gerados em `integrations/supabase/types.ts`
- **Imports:** Usar path alias `@/` sempre (ex: `import { Button } from "@/components/ui/button"`)
- **Data fetching:** Usar TanStack React Query (useQuery/useMutation)
- **Forms:** React Hook Form + Zod para validacao
- **Notificacoes:** Sonner toast (import de `sonner`)

## Variaveis de Ambiente

Prefixo `VITE_` obrigatorio para exposicao no frontend:
- `VITE_SUPABASE_URL` - URL do projeto Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Chave anon publica
- `VITE_SUPABASE_PROJECT_ID` - ID do projeto

## Testes

- **Unitarios:** `src/**/*.{test,spec}.{ts,tsx}` com Vitest + jsdom
- **E2E:** Playwright (config em `playwright.config.ts`)
- Setup inclui mock de `matchMedia` para componentes responsivos

## Observacoes Importantes

- Projeto originado no Lovable (AI platform) - tagger ativo em dev
- Package manager principal: npm (tambem tem bun.lock)
- Supabase project ID: `xhfpjtswcsotfdssgxsh`
- Nao commitar `.env` com chaves reais em repositorios publicos
