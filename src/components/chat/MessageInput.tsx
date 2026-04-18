import { useState, useRef, useEffect } from "react";
import { Send, Smile, MessageSquare } from "lucide-react";
import { useSendMessage, useSendMedia, useTypingIndicator } from "@/hooks/useSendMessage";
import { toast } from "sonner";
import AttachmentMenu from "./AttachmentMenu";
import AudioRecorder from "./AudioRecorder";
import ReplyBar from "./ReplyBar";
import QuickReplyPopup from "./QuickReplyPopup";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import type { Message } from "@/hooks/useMessages";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MessageInputProps {
  conversationId: string;
  onFileSelected?: (file: File) => void;
  onAudioReady?: (blob: Blob) => void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  onReplySent?: () => void;
  onContactClick?: () => void;
}

export default function MessageInput({
  conversationId,
  onFileSelected,
  onAudioReady,
  replyTo,
  onCancelReply,
  onReplySent,
  onContactClick,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [quickReplyOpen, setQuickReplyOpen] = useState(false);
  const sendMessage = useSendMessage();
  const sendMedia = useSendMedia();
  const typing = useTypingIndicator();
  const inputRef = useRef<HTMLInputElement>(null);
  const recorder = useAudioRecorder();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      typing.startTyping(conversationId);
    }
  };

  const handleEmojiSelect = (emoji: { native: string }) => {
    setMessage((prev) => prev + emoji.native);
    inputRef.current?.focus();
  };

  const handleStartRecording = async () => {
    try {
      await recorder.start();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleStopRecording = () => {
    recorder.stop();
  };

  useEffect(() => {
    if (recorder.blob && onAudioReady) {
      onAudioReady(recorder.blob);
      recorder.reset();
    }
  }, [recorder.blob]);

  const handleSend = () => {
    const content = message.trim();
    if (!content) return;

    setMessage("");
    typing.stopTyping(conversationId);
    const metadata = replyTo
      ? { reply_to: replyTo.id }
      : undefined;

    sendMessage.mutate(
      { conversation_id: conversationId, content, metadata },
      {
        onSuccess: () => onReplySent?.(),
        onError: (err) => {
          toast.error("Erro ao enviar mensagem: " + (err as Error).message);
          setMessage(content);
        },
      }
    );
  };

  const handleQuickReplyText = (content: string) => {
    setMessage(content);
    inputRef.current?.focus();
  };

  const handleQuickReplyMedia = (mediaUrl: string, mediaType: string, caption?: string) => {
    sendMedia.mutate(
      {
        conversation_id: conversationId,
        media_url: mediaUrl,
        media_type: mediaType,
        caption,
      },
      {
        onError: (err) => {
          toast.error("Erro ao enviar mídia: " + (err as Error).message);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t bg-card relative">
      {replyTo && (
        <ReplyBar message={replyTo} onCancel={onCancelReply || (() => {})} />
      )}

      {/* Quick Reply Popup */}
      <QuickReplyPopup
        open={quickReplyOpen}
        onClose={() => setQuickReplyOpen(false)}
        onSelectText={handleQuickReplyText}
        onSelectMedia={handleQuickReplyMedia}
      />

      <div className="flex items-center gap-2 p-4">
        {!recorder.recording && (
          <AttachmentMenu
            onFileSelected={onFileSelected || (() => {})}
            onContactClick={onContactClick || (() => {})}
          />
        )}

        {recorder.recording ? (
          <AudioRecorder
            recording={recorder.recording}
            elapsed={recorder.elapsed}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            onCancel={recorder.cancel}
          />
        ) : (
          <>
            <input
              ref={inputRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="flex-1 rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />

            {/* Quick replies button */}
            <button
              onClick={() => setQuickReplyOpen(!quickReplyOpen)}
              className={`rounded-lg p-2 transition-colors ${
                quickReplyOpen
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-secondary text-muted-foreground"
              }`}
              title="Respostas rápidas"
            >
              <MessageSquare className="h-5 w-5" />
            </button>

            <Popover>
              <PopoverTrigger asChild>
                <button className="rounded-lg p-2 hover:bg-secondary transition-colors text-muted-foreground">
                  <Smile className="h-5 w-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                className="w-auto p-0 border-none shadow-xl"
              >
                <Picker
                  data={data}
                  onEmojiSelect={handleEmojiSelect}
                  theme="auto"
                  locale="pt"
                  previewPosition="none"
                  skinTonePosition="search"
                />
              </PopoverContent>
            </Popover>
          </>
        )}

        {!recorder.recording && (
          <>
            <AudioRecorder
              recording={false}
              elapsed={0}
              onStart={handleStartRecording}
              onStop={() => {}}
              onCancel={() => {}}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending}
              className="rounded-lg bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
