import { useState } from "react";
import { Search, Bot, Loader2, Smartphone, AlertCircle, RefreshCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { statusConfig, getInitials, formatRelativeTime, formatPhone } from "@/lib/chat-utils";
import type { ConversationWithContact } from "@/hooks/useConversations";
import type { WhatsAppSession } from "@/hooks/useWhatsAppSessions";

interface ConversationListProps {
  conversations: ConversationWithContact[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  sessions?: WhatsAppSession[];
  selectedSessionId: string | null;
  onSessionChange: (sessionId: string | null) => void;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  isLoading,
  isError,
  error,
  onRetry,
  sessions,
  selectedSessionId,
  onSessionChange,
}: ConversationListProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("mine");

  const filteredBySession = selectedSessionId
    ? conversations?.filter((c) => c.session_id === selectedSessionId)
    : conversations;

  const filteredByTab = filteredBySession?.filter((c) => {
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

  const connectedSessions = sessions?.filter((s) => s.status === "connected") || [];
  const hasMultipleSessions = (sessions?.length || 0) > 1;

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

        {/* Session selector */}
        {hasMultipleSessions && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-thin pb-0.5">
            <button
              onClick={() => onSessionChange(null)}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedSessionId === null
                  ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
              }`}
            >
              Todas
            </button>
            {sessions?.map((s) => (
              <button
                key={s.id}
                onClick={() => onSessionChange(s.id)}
                className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedSessionId === s.id
                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                    : "bg-secondary/60 text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Smartphone className="h-3 w-3" />
                {s.name}
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    s.status === "connected" ? "bg-green-500" : "bg-red-500"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pt-3 pb-2 border-b">
        <TabsList className="w-full grid grid-cols-3 h-8">
          <TabsTrigger value="mine" className="text-xs">Minhas</TabsTrigger>
          <TabsTrigger value="unassigned" className="text-xs">Não atribuídas</TabsTrigger>
          <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex-1 overflow-auto scrollbar-thin">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && isError && (
          <div className="flex flex-col items-center gap-2 py-8 px-4 text-center">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <p className="text-sm text-destructive font-medium">Erro ao carregar conversas</p>
            <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
            {onRetry && (
              <button
                onClick={() => onRetry()}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium mt-1"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Tentar novamente
              </button>
            )}
          </div>
        )}
        {!isLoading && !isError && filtered?.length === 0 && (
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
                <div className="flex items-center gap-1.5 mt-0.5 max-w-full overflow-hidden">
                  <p className="text-xs text-muted-foreground truncate shrink-0">
                    {formatPhone(conv.contacts.phone)}
                  </p>
                  {conv.contacts.contact_tags?.slice(0, 2).map((ct) =>
                    ct.tags && (
                      <span
                        key={ct.tag_id}
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-medium truncate flex-[0_1_auto]"
                        style={{
                          backgroundColor: ct.tags.color ? `${ct.tags.color}20` : undefined,
                          color: ct.tags.color || undefined,
                        }}
                      >
                        {ct.tags.name}
                      </span>
                    )
                  )}
                  {conv.contacts.contact_tags && conv.contacts.contact_tags.length > 2 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-secondary text-muted-foreground shrink-0">
                      +{conv.contacts.contact_tags.length - 2}
                    </span>
                  )}
                </div>
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
