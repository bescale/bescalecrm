import { useState } from "react";
import { Search, Bot, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { statusConfig, getInitials, formatRelativeTime, formatPhone } from "@/lib/chat-utils";
import type { ConversationWithContact } from "@/hooks/useConversations";

interface ConversationListProps {
  conversations: ConversationWithContact[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
}: ConversationListProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
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

  return (
    <div className="w-[340px] border-r flex flex-col bg-card">
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
      </div>
      <div className="flex-1 overflow-auto scrollbar-thin">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && filtered?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Nenhuma conversa encontrada
          </p>
        )}
        {filtered?.map((conv) => {
          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full flex items-start gap-3 p-4 text-left border-b transition-colors hover:bg-secondary/50 ${
                selectedId === conv.id
                  ? "bg-primary/5 border-l-2 border-l-primary"
                  : ""
              }`}
            >
              <div className="relative shrink-0">
                {conv.contacts.custom_fields?.avatar_url ? (
                  <img
                    src={conv.contacts.custom_fields.avatar_url}
                    alt={conv.contacts.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                    {getInitials(conv.contacts.name)}
                  </div>
                )}
                {conv.status === "ai" && (
                  <Bot className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-crm-status-ai bg-card rounded-full p-0.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">
                    {conv.contacts.name}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatRelativeTime(conv.last_message_at)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {formatPhone(conv.contacts.phone)}
                </p>
                <div className="flex items-center justify-between mt-1.5">
                  {conv.profiles ? (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-crm-status-human/15 text-crm-status-human"
                    >
                      {conv.profiles.full_name}
                    </span>
                  ) : (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusConfig.unassigned.class}`}
                    >
                      {statusConfig.unassigned.label}
                    </span>
                  )}
                  {conv.unread_count > 0 && (
                    <span className="h-5 min-w-[20px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
