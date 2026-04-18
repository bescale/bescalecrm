# Conversation Tabs + Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tab filtering (Minhas, Nao Atribuidas, Todas) and functional search (name + phone) to the conversation list sidebar.

**Architecture:** Client-side filtering over the existing `useConversations` data. Tabs filter by `assigned_to` field, search filters by contact name and phone. Both filters are chained (tab first, then search within tab). Single file modification.

**Tech Stack:** React, shadcn/ui Tabs (Radix), TanStack React Query, Tailwind CSS

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `projeto-harry-main/src/components/chat/ConversationList.tsx` | Add Tabs UI, tab state, dual filter logic (tab + search), useAuth import |

No new files created. All other files remain untouched.

---

### Task 1: Add tab state and filtering logic

**Files:**
- Modify: `projeto-harry-main/src/components/chat/ConversationList.tsx:1-24`

- [ ] **Step 1: Add imports for Tabs and useAuth**

At the top of `ConversationList.tsx`, add:

```typescript
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
```

- [ ] **Step 2: Add tab state and filtering logic**

Inside the component function, after the existing `search` state, add tab state and replace the existing `filtered` logic:

```typescript
const { user } = useAuth();
const [activeTab, setActiveTab] = useState("mine");

const filteredByTab = conversations?.filter((c) => {
  if (activeTab === "mine") return c.assigned_to === user?.id;
  if (activeTab === "unassigned") return c.assigned_to === null;
  return true; // "all"
});

const filtered = filteredByTab?.filter((c) => {
  if (!search) return true;
  const term = search.toLowerCase();
  const nameMatch = c.contacts.name.toLowerCase().includes(term);
  const phoneMatch = c.contacts.phone?.toLowerCase().includes(term) ?? false;
  return nameMatch || phoneMatch;
});
```

Remove the old `filtered` const that only filtered by name.

- [ ] **Step 3: Verify the file saves without syntax errors**

Run: `cd "C:/Users/Harry.Dev/Desktop/projeto-harry-main (1)/projeto-harry-main" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to ConversationList.tsx

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Harry.Dev/Desktop/projeto-harry-main (1)/projeto-harry-main"
git add src/components/chat/ConversationList.tsx
git commit -m "feat(chat): add tab filtering logic (mine/unassigned/all) and search by name+phone"
```

---

### Task 2: Add Tabs UI to the sidebar header

**Files:**
- Modify: `projeto-harry-main/src/components/chat/ConversationList.tsx:27-39`

- [ ] **Step 1: Compute tab counts**

Add count variables right after the `filtered` const:

```typescript
const countMine = conversations?.filter((c) => c.assigned_to === user?.id).length ?? 0;
const countUnassigned = conversations?.filter((c) => c.assigned_to === null).length ?? 0;
const countAll = conversations?.length ?? 0;
```

- [ ] **Step 2: Add Tabs component to the header**

Replace the header `<div className="p-4 border-b space-y-3">` block with:

```tsx
<div className="p-4 border-b space-y-3">
  <h2 className="font-semibold text-lg">Conversas</h2>
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Buscar conversa..."
      className="w-full rounded-lg border bg-secondary/50 py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
    />
  </div>
  <Tabs value={activeTab} onValueChange={setActiveTab}>
    <TabsList className="w-full">
      <TabsTrigger value="mine" className="flex-1 text-xs">
        Minhas ({countMine})
      </TabsTrigger>
      <TabsTrigger value="unassigned" className="flex-1 text-xs">
        Nao atribuidas ({countUnassigned})
      </TabsTrigger>
      <TabsTrigger value="all" className="flex-1 text-xs">
        Todas ({countAll})
      </TabsTrigger>
    </TabsList>
  </Tabs>
</div>
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd "C:/Users/Harry.Dev/Desktop/projeto-harry-main (1)/projeto-harry-main" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Verify visually with dev server**

Run: `cd "C:/Users/Harry.Dev/Desktop/projeto-harry-main (1)/projeto-harry-main" && npm run dev`
Expected: Chat page at http://localhost:8080/chat shows tabs (Minhas, Nao atribuidas, Todas) with counts, search bar filters within active tab

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/Harry.Dev/Desktop/projeto-harry-main (1)/projeto-harry-main"
git add src/components/chat/ConversationList.tsx
git commit -m "feat(chat): add tabs UI with counters for mine/unassigned/all"
```

---

### Task 3: Final verification

**Files:**
- Read: `projeto-harry-main/src/components/chat/ConversationList.tsx` (full file)

- [ ] **Step 1: Read the final file and verify completeness**

Read the full `ConversationList.tsx` and confirm:
1. Imports include `Tabs`, `TabsList`, `TabsTrigger` from `@/components/ui/tabs`
2. Imports include `useAuth` from `@/contexts/AuthContext`
3. `activeTab` state defaults to `"mine"`
4. Tab filter logic: `mine` checks `assigned_to === user?.id`, `unassigned` checks `assigned_to === null`, `all` passes everything
5. Search filter: checks `name` and `phone`, case-insensitive, applied after tab filter
6. Tabs UI renders 3 triggers with counters
7. Counts are computed from the full `conversations` array (not the filtered one)

- [ ] **Step 2: Run lint**

Run: `cd "C:/Users/Harry.Dev/Desktop/projeto-harry-main (1)/projeto-harry-main" && npm run lint 2>&1 | head -30`
Expected: No errors in ConversationList.tsx

- [ ] **Step 3: Run build**

Run: `cd "C:/Users/Harry.Dev/Desktop/projeto-harry-main (1)/projeto-harry-main" && npm run build 2>&1 | tail -10`
Expected: Build succeeds

- [ ] **Step 4: Final commit if any lint fixes were needed**

```bash
cd "C:/Users/Harry.Dev/Desktop/projeto-harry-main (1)/projeto-harry-main"
git add src/components/chat/ConversationList.tsx
git commit -m "fix(chat): lint fixes for conversation tabs"
```
