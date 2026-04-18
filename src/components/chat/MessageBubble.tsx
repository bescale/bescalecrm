import { useState } from "react";
import { Bot, FileText, Download, X, Forward, MapPin, User } from "lucide-react";
import type { Message } from "@/hooks/useMessages";
import { formatMessageTime } from "@/lib/chat-utils";
import MessageContextMenu from "./MessageContextMenu";
import EmojiReactionPicker from "./EmojiReactionPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const SUPABASE_URL = "https://xhfpjtswcsotfdssgxsh.supabase.co";

/** If the URL is already a Supabase Storage URL, use it directly.
 *  Otherwise, proxy it through the whatsapp-media edge function. */
function resolveMediaUrl(rawUrl: string): string {
  if (rawUrl.startsWith(SUPABASE_URL)) return rawUrl;
  return `${SUPABASE_URL}/functions/v1/whatsapp-media?url=${encodeURIComponent(rawUrl)}`;
}

interface MessageBubbleProps {
  message: Message;
  onReply?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
  onForward?: (message: Message) => void;
}

function getFileName(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split("/").pop() || "arquivo";
    return decodeURIComponent(name);
  } catch {
    return "arquivo";
  }
}

function ImageMedia({ url }: { url: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <img
        src={url}
        alt="Midia"
        className="rounded-lg mb-2 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setExpanded(true)}
      />
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setExpanded(false)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setExpanded(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={url}
            alt="Midia"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}

function AudioMedia({ url }: { url: string }) {
  return (
    <audio controls className="mb-2 max-w-full min-w-[200px]">
      <source src={url} />
      Seu navegador nao suporta audio.
    </audio>
  );
}

function VideoMedia({ url }: { url: string }) {
  return (
    <video
      controls
      className="rounded-lg mb-2 max-w-full max-h-[300px]"
      preload="metadata"
    >
      <source src={url} />
      Seu navegador nao suporta video.
    </video>
  );
}

function DocumentMedia({ url, isLead }: { url: string; isLead: boolean }) {
  const fileName = getFileName(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-lg p-3 mb-2 transition-colors ${
        isLead
          ? "bg-muted/50 hover:bg-muted"
          : "bg-white/10 hover:bg-white/20"
      }`}
    >
      <div
        className={`flex-shrink-0 rounded-lg p-2 ${
          isLead ? "bg-muted" : "bg-white/10"
        }`}
      >
        <FileText className="h-5 w-5" />
      </div>
      <span className="flex-1 text-xs truncate">{fileName}</span>
      <Download className="h-4 w-4 flex-shrink-0 opacity-60" />
    </a>
  );
}

export default function MessageBubble({
  message,
  onReply,
  onReact,
  onForward,
}: MessageBubbleProps) {
  const isLead = message.sender_type === "lead";
  const isAi = message.sender_type === "ai";
  const replyToId = (message.metadata as any)?.reply_to as string | undefined;
  const reactions = (message.metadata as any)?.reactions as
    | { emoji: string; sender_id: string }[]
    | undefined;

  const isForwarded = (message.metadata as any)?.forwarded === true;
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const handleReactClick = () => {
    setShowReactionPicker(true);
  };

  const handleEmojiReaction = (emoji: string) => {
    onReact?.(message, emoji);
    setShowReactionPicker(false);
  };

  const renderMedia = () => {
    if (!message.media_url) return null;

    const url = resolveMediaUrl(message.media_url);

    switch (message.media_type) {
      case "image":
        return <ImageMedia url={url} />;
      case "audio":
      case "ptt":
        return <AudioMedia url={url} />;
      case "video":
        return <VideoMedia url={url} />;
      case "location": {
        const loc = (message.metadata as any)?.location;
        return (
          <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-secondary/50">
            <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="text-xs">
              {loc?.name && <p className="font-medium">{loc.name}</p>}
              {loc?.address && <p className="text-muted-foreground">{loc.address}</p>}
              <p className="text-muted-foreground">
                {loc?.latitude}, {loc?.longitude}
              </p>
            </div>
          </div>
        );
      }
      case "contact": {
        const ct = (message.metadata as any)?.contact;
        return (
          <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-secondary/50">
            <User className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="text-xs">
              <p className="font-medium">{ct?.name || message.content}</p>
              {ct?.phone && (
                <p className="text-muted-foreground">{ct.phone}</p>
              )}
            </div>
          </div>
        );
      }
      case "document":
      case "file":
      default:
        return <DocumentMedia url={url} isLead={isLead} />;
    }
  };

  return (
    <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
      <MessageContextMenu
        message={message}
        onReply={onReply || (() => {})}
        onReact={handleReactClick}
        onForward={onForward || (() => {})}
      >
        <PopoverTrigger asChild>
          <div className={`flex flex-col ${isLead ? "items-start" : "items-end"}`}>
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                isLead
                  ? "bg-card border"
                  : isAi
                  ? "bg-crm-status-ai/10 border border-crm-status-ai/20"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {isAi && (
                <div className="flex items-center gap-1 mb-1 text-[10px] font-medium text-crm-status-ai">
                  <Bot className="h-3 w-3" /> Agente IA
                </div>
              )}

              {isForwarded && (
                <div className="flex items-center gap-1 mb-1 text-[10px] text-muted-foreground italic">
                  <Forward className="h-3 w-3" /> Encaminhada
                </div>
              )}

              {replyToId && (
                <div className="rounded bg-secondary/50 border-l-2 border-primary px-2 py-1 mb-2 text-xs">
                  <p className="text-muted-foreground truncate italic">
                    Mensagem respondida
                  </p>
                </div>
              )}

              {renderMedia()}

              {message.content && <p>{message.content}</p>}
              <p
                className={`text-[10px] mt-1 ${
                  isLead ? "text-muted-foreground" : "opacity-70"
                }`}
              >
                {formatMessageTime(message.created_at)}
              </p>
            </div>
            {reactions && reactions.length > 0 && (
              <div className={`flex gap-1 mt-0.5 ${isLead ? "justify-start" : "justify-end"}`}>
                {reactions.map((r, i) => (
                  <span
                    key={i}
                    className="text-xs bg-secondary rounded-full px-1.5 py-0.5 border"
                  >
                    {r.emoji}
                  </span>
                ))}
              </div>
            )}
          </div>
        </PopoverTrigger>
      </MessageContextMenu>
      <PopoverContent side="top" className="w-auto p-0">
        <EmojiReactionPicker onSelect={handleEmojiReaction} />
      </PopoverContent>
    </Popover>
  );
}
