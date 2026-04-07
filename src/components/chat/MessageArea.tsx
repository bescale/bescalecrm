import { useEffect, useRef } from "react";
import { Phone, MoreVertical, Loader2, Bot, UserCheck, Clock, XCircle, CheckCheck, Copy } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useMessages } from "@/hooks/useMessages";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useMarkAsRead } from "@/hooks/useSendMessage";
import { statusConfig, getInitials, formatPhone } from "@/lib/chat-utils";
import type { ConversationWithContact } from "@/hooks/useConversations";
import type { ConversationStatus } from "@/lib/chat-utils";
import MessageBubble from "./MessageBubble";
import DropZone from "./DropZone";
import type { Message } from "@/hooks/useMessages";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// ── mutation to update conversation status / assigned_to ────────────────────

function useUpdateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      status?: string;
      assigned_to?: string | null;
      unread_count?: number;
    }) => {
      const { id, ...update } = params;
      const { error } = await supabase
        .from("conversations")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

// ── props ────────────────────────────────────────────────────────────────────

interface MessageAreaProps {
  conversation: ConversationWithContact;
  onFileDrop?: (file: File) => void;
  onReply?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onForward?: (message: Message) => void;
}

export default function MessageArea({ conversation, onFileDrop, onReply, onReact, onForward }: MessageAreaProps) {
  const { data: messages, isLoading } = useMessages(conversation.id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markAsRead = useMarkAsRead();
  const updateConversation = useUpdateConversation();
  const { user } = useAuth();

  useRealtimeMessages(conversation.id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversation.unread_count > 0 && !markAsRead.isPending) {
      markAsRead.mutate(conversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const status = conversation.status as ConversationStatus;
  const cfg = statusConfig[status] || statusConfig.unassigned;

  // ── helpers ──────────────────────────────────────────────────────────────

  const changeStatus = (newStatus: string, successMsg: string) => {
    updateConversation.mutate(
      { id: conversation.id, status: newStatus },
      { onSuccess: () => toast.success(successMsg) }
    );
  };

  const handleAssumirAtendimento = () => {
    updateConversation.mutate(
      { id: conversation.id, status: "human", assigned_to: user?.id ?? null },
      { onSuccess: () => toast.success("Atendimento assumido") }
    );
  };

  const handleMarkUnread = () => {
    updateConversation.mutate(
      { id: conversation.id, unread_count: 1 },
      { onSuccess: () => toast.success("Marcado como não lido") }
    );
  };

  const handleCopyPhone = () => {
    const phone = conversation.contacts.phone;
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    toast.success("Telefone copiado");
  };

  // ── header ───────────────────────────────────────────────────────────────

  const header = (
    <div className="flex items-center justify-between border-b px-6 py-3 bg-card shrink-0">
      <div className="flex items-center gap-3">
        {conversation.contacts.custom_fields?.avatar_url ? (
          <img
            src={conversation.contacts.custom_fields.avatar_url}
            alt={conversation.contacts.name}
            className="h-10 w-10 rounded-full object-cover"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {getInitials(conversation.contacts.name)}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-sm">{conversation.contacts.name}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {formatPhone(conversation.contacts.phone)}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.class}`}>
              {cfg.label}
            </span>
            {conversation.contacts.contact_tags?.map(ct => ct.tags && (
              <span 
                key={ct.tag_id}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: ct.tags.color ? `${ct.tags.color}20` : undefined,
                  color: ct.tags.color || undefined,
                }}
              >
                {ct.tags.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3-dot menu ─────────────────────────────────────────────────── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-lg p-2 hover:bg-secondary transition-colors outline-none">
            <MoreVertical className="h-5 w-5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-52">

          {/* Status actions */}
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            Alterar status
          </DropdownMenuLabel>

          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={handleAssumirAtendimento}
            disabled={status === "human" && conversation.assigned_to === user?.id}
          >
            <UserCheck className="h-4 w-4 text-blue-500" />
            Assumir atendimento
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() => changeStatus("ai", "Transferido para IA")}
            disabled={status === "ai"}
          >
            <Bot className="h-4 w-4 text-violet-500" />
            Passar para IA
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() => changeStatus("waiting", "Conversa em espera")}
            disabled={status === "waiting"}
          >
            <Clock className="h-4 w-4 text-yellow-500" />
            Colocar em espera
          </DropdownMenuItem>

          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={() =>
              updateConversation.mutate(
                { id: conversation.id, status: "closed", assigned_to: null },
                { onSuccess: () => toast.success("Conversa encerrada") }
              )
            }
            disabled={status === "closed"}
          >
            <XCircle className="h-4 w-4 text-red-500" />
            Encerrar conversa
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Utility actions */}
          <DropdownMenuItem
            className="gap-2 cursor-pointer"
            onClick={handleMarkUnread}
            disabled={conversation.unread_count > 0}
          >
            <CheckCheck className="h-4 w-4 text-muted-foreground" />
            Marcar como não lido
          </DropdownMenuItem>

          {conversation.contacts.phone && (
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleCopyPhone}>
              <Copy className="h-4 w-4 text-muted-foreground" />
              Copiar telefone
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // ── messages list ─────────────────────────────────────────────────────────

  const messagesList = (
    <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4 bg-secondary/30">
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!isLoading && messages?.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Nenhuma mensagem ainda
        </p>
      )}
      {messages?.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onReply={onReply} onReact={onReact} onForward={onForward} />
      ))}
      <div ref={bottomRef} />
    </div>
  );

  const content = (
    <div className="flex flex-col flex-1 min-h-0">
      {header}
      {messagesList}
    </div>
  );

  if (onFileDrop) {
    return (
      <DropZone onFileDrop={onFileDrop}>
        {content}
      </DropZone>
    );
  }

  return content;
}
