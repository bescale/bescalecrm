import { X, Reply } from "lucide-react";
import type { Message } from "@/hooks/useMessages";

interface ReplyBarProps {
  message: Message;
  onCancel: () => void;
}

export default function ReplyBar({ message, onCancel }: ReplyBarProps) {
  const preview =
    message.content?.slice(0, 80) ||
    (message.media_type ? `[${message.media_type}]` : "");

  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
      <Reply className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="flex-1 rounded-lg bg-primary/5 border-l-2 border-primary px-3 py-1.5 text-xs truncate">
        <span className="font-medium">
          {message.sender_type === "lead" ? "Contato" : "Você"}
        </span>
        <span className="ml-2 text-muted-foreground">{preview}</span>
      </div>
      <button
        onClick={onCancel}
        className="rounded p-1 hover:bg-secondary text-muted-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
