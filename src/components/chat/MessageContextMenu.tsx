// src/components/chat/MessageContextMenu.tsx
import { Reply, SmilePlus, Forward, Copy } from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Message } from "@/hooks/useMessages";

interface MessageContextMenuProps {
  message: Message;
  onReply: (message: Message) => void;
  onReact: () => void;
  onForward: (message: Message) => void;
  children: React.ReactNode;
}

export default function MessageContextMenu({
  message,
  onReply,
  onReact,
  onForward,
  children,
}: MessageContextMenuProps) {
  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onReply(message)}>
          <Reply className="h-4 w-4 mr-2" />
          Responder
        </ContextMenuItem>
        <ContextMenuItem onClick={onReact}>
          <SmilePlus className="h-4 w-4 mr-2" />
          Reagir
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onForward(message)}>
          <Forward className="h-4 w-4 mr-2" />
          Encaminhar
        </ContextMenuItem>
        {message.content && (
          <ContextMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar texto
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
