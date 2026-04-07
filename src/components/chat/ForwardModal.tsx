import { useState } from "react";
import { Search, Forward, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConversations } from "@/hooks/useConversations";
import { getInitials } from "@/lib/chat-utils";

interface ForwardModalProps {
  open: boolean;
  onClose: () => void;
  onForward: (targetConversationId: string) => void;
  currentConversationId: string;
  forwarding: boolean;
}

export default function ForwardModal({
  open,
  onClose,
  onForward,
  currentConversationId,
  forwarding,
}: ForwardModalProps) {
  const [search, setSearch] = useState("");
  const { data: conversations } = useConversations();

  const filtered = conversations
    ?.filter((c) => c.id !== currentConversationId)
    .filter(
      (c) =>
        !search ||
        c.contacts.name.toLowerCase().includes(search.toLowerCase()) ||
        c.contacts.phone?.includes(search)
    );

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Encaminhar mensagem</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversa..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-secondary/50 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="max-h-64 overflow-auto space-y-1">
            {filtered?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onForward(conv.id)}
                disabled={forwarding}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary transition-colors text-left disabled:opacity-50"
              >
                {conv.contacts.custom_fields?.avatar_url ? (
                  <img
                    src={conv.contacts.custom_fields.avatar_url}
                    alt={conv.contacts.name}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                    {getInitials(conv.contacts.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.contacts.name}</p>
                  <p className="text-xs text-muted-foreground">{conv.contacts.phone}</p>
                </div>
                {forwarding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Forward className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
