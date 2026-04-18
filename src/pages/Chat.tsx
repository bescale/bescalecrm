import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useConversations } from "@/hooks/useConversations";
import { useRealtimeConversations } from "@/hooks/useRealtimeMessages";
import { useSendMedia, useReaction, useForwardMessage, useSendContact } from "@/hooks/useSendMessage";
import { useWhatsAppSessions } from "@/hooks/useWhatsAppSessions";
import ContactPickerModal from "@/components/chat/ContactPickerModal";
import { useFileUpload } from "@/hooks/useFileUpload";
import ConversationList from "@/components/chat/ConversationList";
import MessageArea from "@/components/chat/MessageArea";
import MessageInput from "@/components/chat/MessageInput";
import ContactSidebar from "@/components/chat/ContactSidebar";
import FilePreviewModal from "@/components/chat/FilePreviewModal";
import ForwardModal from "@/components/chat/ForwardModal";
import type { Message } from "@/hooks/useMessages";

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("conversation")
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const convId = searchParams.get("conversation");
    if (convId && convId !== selectedId) {
      setSelectedId(convId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, selectedId, setSearchParams]);

  const { data: conversations, isLoading, isError, error, refetch } = useConversations();
  const { data: sessions } = useWhatsAppSessions();
  useRealtimeConversations();

  const selected = conversations?.find((c) => c.id === selectedId) || null;
  const { upload, uploading } = useFileUpload();
  const sendMedia = useSendMedia();
  const reaction = useReaction();
  const forwardMutation = useForwardMessage();
  const sendContact = useSendContact();

  const handleSendContact = (contact: { name: string; phone: string }) => {
    if (!selected) return;
    sendContact.mutate(
      {
        conversation_id: selected.id,
        contact_name: contact.name,
        contact_phone: contact.phone,
      },
      {
        onSuccess: () => setShowContactPicker(false),
        onError: (err) => toast.error("Erro: " + (err as Error).message),
      }
    );
  };

  const handleReact = (msg: Message, emoji: string) => {
    if (!selected) return;
    reaction.mutate({
      conversation_id: selected.id,
      message_id: msg.id,
      reaction: emoji,
    });
  };

  const handleForward = (targetConversationId: string) => {
    if (!selected || !forwardMessage) return;
    forwardMutation.mutate(
      {
        conversation_id: selected.id,
        message_id: forwardMessage.id,
        target_conversation_id: targetConversationId,
      },
      {
        onSuccess: () => {
          toast.success("Mensagem encaminhada");
          setForwardMessage(null);
        },
        onError: (err) => {
          toast.error("Erro ao encaminhar: " + (err as Error).message);
        },
      }
    );
  };

  const handleFileSelected = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Arquivo excede o limite de 50MB");
      return;
    }
    setPendingFile(file);
  };

  const handleAudioReady = async (blob: Blob) => {
    if (!selected) return;
    try {
      const file = new File([blob], `audio-${Date.now()}.webm`, {
        type: "audio/webm;codecs=opus",
      });
      const result = await upload(file);
      sendMedia.mutate({
        conversation_id: selected.id,
        media_url: result.url,
        media_type: "audio",
        filename: file.name,
        mimetype: "audio/ogg",
      });
    } catch (err) {
      toast.error("Erro ao enviar áudio: " + (err as Error).message);
    }
  };

  const handleSendFile = async (file: File, caption: string) => {
    if (!selected) return;
    try {
      const result = await upload(file);
      sendMedia.mutate({
        conversation_id: selected.id,
        media_url: result.url,
        media_type: result.mediaType,
        caption: caption || undefined,
        filename: file.name,
        mimetype: file.type,
      });
      setPendingFile(null);
    } catch (err) {
      toast.error("Erro ao enviar arquivo: " + (err as Error).message);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <ConversationList
        conversations={conversations}
        selectedId={selectedId}
        onSelect={setSelectedId}
        isLoading={isLoading}
        isError={isError}
        error={error}
        onRetry={refetch}
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSessionChange={setSelectedSessionId}
      />

      {selected ? (
        <>
          <div className="flex-1 flex flex-col min-h-0">
            <MessageArea
              conversation={selected}
              onFileDrop={handleFileSelected}
              onReply={setReplyTo}
              onReact={handleReact}
              onForward={setForwardMessage}
            />
            <MessageInput
              conversationId={selected.id}
              onFileSelected={handleFileSelected}
              onAudioReady={handleAudioReady}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              onReplySent={() => setReplyTo(null)}
              onContactClick={() => setShowContactPicker(true)}
            />
          </div>
          <ContactSidebar conversation={selected} />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-secondary/30">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Selecione uma conversa</p>
            <p className="text-sm mt-1">Escolha uma conversa ao lado para iniciar</p>
          </div>
        </div>
      )}

      <ForwardModal
        open={!!forwardMessage}
        onClose={() => setForwardMessage(null)}
        onForward={handleForward}
        currentConversationId={selected?.id || ""}
        forwarding={forwardMutation.isPending}
      />

      <FilePreviewModal
        file={pendingFile}
        onSend={handleSendFile}
        onCancel={() => setPendingFile(null)}
        sending={uploading || sendMedia.isPending}
      />

      <ContactPickerModal
        open={showContactPicker}
        onClose={() => setShowContactPicker(false)}
        onSelect={handleSendContact}
        sending={sendContact.isPending}
      />
    </div>
  );
}
