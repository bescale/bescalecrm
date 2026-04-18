# Design: Abas de Conversas + Busca Funcional

**Data:** 2026-03-31
**Status:** Aprovado

## Objetivo

Adicionar seleção de abas (Minhas, Não Atribuídas, Todas) na lista de conversas do chat para separar conversas por status de atribuição, e tornar a barra de pesquisa funcional com busca por nome e telefone.

## Abordagem

Client-side filtering sobre os dados já carregados pelo hook `useConversations`. Sem mudanças no backend.

## Abas

| Aba | Valor | Label | Filtro |
|-----|-------|-------|--------|
| Minhas | `mine` | Minhas (N) | `assigned_to === user.id` |
| Não atribuídas | `unassigned` | Não atribuídas (N) | `assigned_to === null` |
| Todas | `all` | Todas (N) | Sem filtro |

- Aba padrão: **Minhas**
- Cada aba exibe contador de conversas entre parênteses
- Estado da aba ativa em `useState<string>` local

## Busca

- Filtra por **nome do contato** e **número de telefone**
- Lógica: `name.includes(search) || phone.includes(search)` (case-insensitive)
- Busca aplicada **dentro da aba ativa** (filtro encadeado: aba primeiro, busca depois)
- Sem debounce (volume baixo, client-side)
- Ao trocar de aba, texto da busca mantido (não limpa o campo)

## Fluxo de Dados

1. `useConversations` carrega todas as conversas (sem mudanças no hook)
2. `ConversationList` aplica filtro da aba ativa sobre o array completo
3. Sobre o resultado da aba, aplica filtro de busca (nome + telefone)
4. Renderiza a lista filtrada

## Componentes Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/chat/ConversationList.tsx` | Adiciona Tabs do shadcn, estado da aba, lógica de filtro duplo (aba + busca), importa `useAuth` |

## Componentes Não Modificados

- `src/hooks/useConversations.ts` — mantém query atual
- `src/pages/Chat.tsx` — sem mudanças
- `src/lib/chat-utils.ts` — sem mudanças

## Dependências Utilizadas

- `@/components/ui/tabs` (Tabs, TabsList, TabsTrigger) — já disponível no projeto
- `useAuth` do `AuthContext` — para obter `user.id` e comparar com `assigned_to`

## Arquivos Novos

Nenhum.
