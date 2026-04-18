import { useState, useEffect } from "react";
import { MessageSquare, Type, Image as ImageIcon, Mic, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type MediaType = "text" | "image" | "audio";

interface QuickReply {
  id: string;
  title: string;
  content: string;
  shortcut: string | null;
  media_type: MediaType;
  media_url: string | null;
}

interface QuickReplyPopupProps {
  open: boolean;
  onClose: () => void;
  onSelectText: (content: string) => void;
  onSelectMedia: (mediaUrl: string, mediaType: string, caption?: string) => void;
}

export default function QuickReplyPopup({
  open,
  onClose,
  onSelectText,
  onSelectMedia,
}: QuickReplyPopupProps) {
  const { profile } = useAuth();
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && profile?.company_id) {
      fetchReplies();
    }
  }, [open, profile?.company_id]);

  async function fetchReplies() {
    setLoading(true);
    const { data } = await supabase
      .from("quick_replies")
      .select("id, title, content, shortcut, media_type, media_url")
      .eq("company_id", profile!.company_id!)
      .order("title");

    setReplies(
      (data || []).map((r) => ({
        ...r,
        media_type: (r.media_type as MediaType) || "text",
      }))
    );
    setLoading(false);
  }

  function handleSelect(reply: QuickReply) {
    if (reply.media_type === "text") {
      onSelectText(reply.content);
    } else if (reply.media_url) {
      onSelectMedia(
        reply.media_url,
        reply.media_type,
        reply.content || undefined
      );
    }
    onClose();
  }

  const filtered = replies.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.content?.toLowerCase().includes(search.toLowerCase()) ||
      r.shortcut?.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 z-50">
      <div className="rounded-xl border bg-card shadow-xl max-h-80 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Respostas Rápidas</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Search */}
        <div className="p-2 border-b shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar resposta..."
            className="w-full rounded-lg bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            autoFocus
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              {search ? "Nenhuma resposta encontrada" : "Nenhuma resposta rápida configurada"}
            </div>
          ) : (
            filtered.map((reply) => {
              const Icon =
                reply.media_type === "image"
                  ? ImageIcon
                  : reply.media_type === "audio"
                  ? Mic
                  : Type;
              const iconColor =
                reply.media_type === "image"
                  ? "text-blue-500"
                  : reply.media_type === "audio"
                  ? "text-purple-500"
                  : "text-green-500";

              return (
                <button
                  key={reply.id}
                  onClick={() => handleSelect(reply)}
                  className="w-full flex items-start gap-3 p-3 text-left hover:bg-secondary/50 transition-colors border-b last:border-b-0"
                >
                  <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {reply.title}
                      </span>
                      {reply.shortcut && (
                        <code className="text-[10px] px-1 py-0.5 rounded bg-secondary font-mono text-muted-foreground">
                          {reply.shortcut}
                        </code>
                      )}
                    </div>
                    {reply.content && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {reply.content}
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
