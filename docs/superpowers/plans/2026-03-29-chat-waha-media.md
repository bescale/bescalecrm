# Chat WAHA — Mídias, Áudio, Emojis e Ações — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habilitar envio de mídias, arquivos, emojis, áudio, reações, reply, forward, typing indicator, localização e contato vCard no chat WhatsApp do NexoCRM.

**Architecture:** Abordagem incremental — cada feature é um ciclo completo (edge function + hook + UI). O backend WAHA já está parcialmente integrado (`useSendMedia`, `whatsapp-messages`). Expandimos a edge function com novas actions e criamos componentes de UI para cada funcionalidade.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix), TanStack React Query, Supabase (Storage + Edge Functions + Realtime), WAHA API, `@emoji-mart/react`, MediaRecorder API.

---

## File Structure

### Novos arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/hooks/useFileUpload.ts` | Upload de arquivo para Supabase Storage, retorna URL pública |
| `src/hooks/useAudioRecorder.ts` | Gerencia MediaRecorder: start, stop, cancel, timer, blob |
| `src/components/chat/AttachmentMenu.tsx` | Dropdown do Paperclip com opções (Imagem/Vídeo, Documento, Localização, Contato) |
| `src/components/chat/FilePreviewModal.tsx` | Modal de preview com thumbnail/nome + caption + enviar/cancelar |
| `src/components/chat/DropZone.tsx` | Overlay de drag-and-drop sobre MessageArea |
| `src/components/chat/AudioRecorder.tsx` | UI de gravação: timer, onda, botões cancelar/enviar |
| `src/components/chat/ReplyBar.tsx` | Barra acima do input com preview da mensagem sendo respondida |
| `src/components/chat/MessageContextMenu.tsx` | ContextMenu (botão direito) com Responder, Reagir, Encaminhar, Copiar |
| `src/components/chat/EmojiReactionPicker.tsx` | Mini picker de 6-8 emojis rápidos + botão "+" |
| `src/components/chat/ForwardModal.tsx` | Modal para selecionar conversa destino de encaminhamento |
| `src/components/chat/LocationModal.tsx` | Modal com lat/lng, geolocation, nome/endereço |
| `src/components/chat/ContactPickerModal.tsx` | Modal com lista de contatos do CRM para enviar vCard |

### Arquivos modificados

| Arquivo | Mudanças |
|---------|----------|
| `src/components/chat/MessageInput.tsx` | Integrar AttachmentMenu, emoji picker, AudioRecorder, ReplyBar, typing indicator |
| `src/components/chat/MessageBubble.tsx` | Wrap com MessageContextMenu, renderizar reações, quote reply, location, contact, forwarded badge |
| `src/components/chat/MessageArea.tsx` | Integrar DropZone, passar callbacks de reply/react para MessageBubble |
| `src/pages/Chat.tsx` | Gerenciar estado de replyTo, propagar para MessageArea e MessageInput |
| `src/hooks/useSendMessage.ts` | Adicionar `useReaction`, `useForwardMessage`, `useSendLocation`, `useSendContact`, `useTypingIndicator` |
| `supabase/functions/whatsapp-messages/index.ts` | Actions: `send-reaction`, `forward-message`, `send-location`, `send-contact`, `start-typing`, `stop-typing`; suporte a `reply_to` em send-text e send-media |
| `supabase/functions/whatsapp-webhook/index.ts` | Tratar evento `message.reaction` |

---

## Task 1: Hook useFileUpload — Upload para Supabase Storage

**Files:**
- Create: `src/hooks/useFileUpload.ts`

- [ ] **Step 1: Criar o hook useFileUpload**

```typescript
// src/hooks/useFileUpload.ts
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UploadResult {
  url: string;
  mediaType: "image" | "video" | "audio" | "document";
}

function detectMediaType(mimeType: string): UploadResult["mediaType"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `uploads/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("chat-media")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("chat-media")
        .getPublicUrl(path);

      setProgress(100);

      return {
        url: data.publicUrl,
        mediaType: detectMediaType(file.type),
      };
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress };
}
```

- [ ] **Step 2: Verificar que o build compila**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros de tipo relacionados a `useFileUpload`

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useFileUpload.ts
git commit -m "feat(chat): hook useFileUpload para upload de arquivos no Supabase Storage"
```

---

## Task 2: AttachmentMenu — Dropdown do Paperclip

**Files:**
- Create: `src/components/chat/AttachmentMenu.tsx`

- [ ] **Step 1: Criar componente AttachmentMenu**

```tsx
// src/components/chat/AttachmentMenu.tsx
import { useRef } from "react";
import { Paperclip, Image, FileText, MapPin, Contact } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AttachmentMenuProps {
  onFileSelected: (file: File) => void;
  onLocationClick: () => void;
  onContactClick: () => void;
}

const MEDIA_ACCEPT = "image/*,video/mp4,video/3gpp";
const DOC_ACCEPT =
  "application/pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function AttachmentMenu({
  onFileSelected,
  onLocationClick,
  onContactClick,
}: AttachmentMenuProps) {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={mediaInputRef}
        type="file"
        accept={MEDIA_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={docInputRef}
        type="file"
        accept={DOC_ACCEPT}
        className="hidden"
        onChange={handleFileChange}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-lg p-2 hover:bg-secondary transition-colors text-muted-foreground">
            <Paperclip className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top">
          <DropdownMenuItem onClick={() => mediaInputRef.current?.click()}>
            <Image className="h-4 w-4 mr-2" />
            Imagem / Vídeo
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => docInputRef.current?.click()}>
            <FileText className="h-4 w-4 mr-2" />
            Documento
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLocationClick}>
            <MapPin className="h-4 w-4 mr-2" />
            Localização
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onContactClick}>
            <Contact className="h-4 w-4 mr-2" />
            Contato
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/AttachmentMenu.tsx
git commit -m "feat(chat): AttachmentMenu dropdown com opções de anexo"
```

---

## Task 3: FilePreviewModal — Preview antes de enviar

**Files:**
- Create: `src/components/chat/FilePreviewModal.tsx`

- [ ] **Step 1: Criar componente FilePreviewModal**

```tsx
// src/components/chat/FilePreviewModal.tsx
import { useState, useEffect } from "react";
import { X, Send, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FilePreviewModalProps {
  file: File | null;
  onSend: (file: File, caption: string) => void;
  onCancel: () => void;
  sending: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilePreviewModal({
  file,
  onSend,
  onCancel,
  sending,
}: FilePreviewModalProps) {
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setCaption("");
      setPreviewUrl(null);
      return;
    }
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  return (
    <Dialog open={!!file} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar arquivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview */}
          {isImage && previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-h-64 object-contain rounded-lg bg-secondary"
            />
          )}
          {isVideo && previewUrl && (
            <video
              src={previewUrl}
              controls
              className="w-full max-h-64 rounded-lg bg-secondary"
            />
          )}
          {!isImage && !isVideo && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium truncate max-w-[300px]">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </p>
              </div>
            </div>
          )}

          {/* Caption */}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Adicionar legenda..."
            className="w-full rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sending) onSend(file, caption);
            }}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={() => onSend(file, caption)} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/FilePreviewModal.tsx
git commit -m "feat(chat): FilePreviewModal com preview de imagem/vídeo/documento e caption"
```

---

## Task 4: DropZone — Drag-and-drop na área de mensagens

**Files:**
- Create: `src/components/chat/DropZone.tsx`

- [ ] **Step 1: Criar componente DropZone**

```tsx
// src/components/chat/DropZone.tsx
import { useState, useCallback } from "react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onFileDrop: (file: File) => void;
  children: React.ReactNode;
}

export default function DropZone({ onFileDrop, children }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const dragCounterRef = { current: 0 };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      dragCounterRef.current = 0;

      const file = e.dataTransfer.files[0];
      if (file) onFileDrop(file);
    },
    [onFileDrop]
  );

  return (
    <div
      className="relative flex-1 flex flex-col"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {dragging && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
          <div className="text-center">
            <Upload className="h-10 w-10 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium text-primary">
              Solte o arquivo aqui
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/DropZone.tsx
git commit -m "feat(chat): DropZone para drag-and-drop de arquivos na área de mensagens"
```

---

## Task 5: Integrar upload na página de Chat

**Files:**
- Modify: `src/pages/Chat.tsx`
- Modify: `src/components/chat/MessageArea.tsx`
- Modify: `src/components/chat/MessageInput.tsx`

- [ ] **Step 1: Atualizar Chat.tsx — estado de arquivo e modais**

Substituir o conteúdo de `src/pages/Chat.tsx`:

```tsx
// src/pages/Chat.tsx
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useConversations } from "@/hooks/useConversations";
import { useRealtimeConversations } from "@/hooks/useRealtimeMessages";
import { useSendMedia } from "@/hooks/useSendMessage";
import { useFileUpload } from "@/hooks/useFileUpload";
import ConversationList from "@/components/chat/ConversationList";
import MessageArea from "@/components/chat/MessageArea";
import MessageInput from "@/components/chat/MessageInput";
import ContactSidebar from "@/components/chat/ContactSidebar";
import FilePreviewModal from "@/components/chat/FilePreviewModal";

export default function Chat() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("conversation")
  );
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  useEffect(() => {
    const convId = searchParams.get("conversation");
    if (convId && convId !== selectedId) {
      setSelectedId(convId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, selectedId, setSearchParams]);

  const { data: conversations, isLoading } = useConversations();
  useRealtimeConversations();

  const selected = conversations?.find((c) => c.id === selectedId) || null;
  const { upload, uploading } = useFileUpload();
  const sendMedia = useSendMedia();

  const handleFileSelected = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Arquivo excede o limite de 50MB");
      return;
    }
    setPendingFile(file);
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
      />

      {selected ? (
        <>
          <div className="flex-1 flex flex-col">
            <MessageArea
              conversation={selected}
              onFileDrop={handleFileSelected}
            />
            <MessageInput
              conversationId={selected.id}
              onFileSelected={handleFileSelected}
            />
          </div>
          <ContactSidebar contact={selected.contacts} />
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

      <FilePreviewModal
        file={pendingFile}
        onSend={handleSendFile}
        onCancel={() => setPendingFile(null)}
        sending={uploading || sendMedia.isPending}
      />
    </div>
  );
}
```

- [ ] **Step 2: Atualizar MessageArea.tsx — integrar DropZone**

Substituir o conteúdo de `src/components/chat/MessageArea.tsx`:

```tsx
// src/components/chat/MessageArea.tsx
import { useEffect, useRef } from "react";
import { Phone, MoreVertical, Loader2 } from "lucide-react";
import { useMessages } from "@/hooks/useMessages";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import { useMarkAsRead } from "@/hooks/useSendMessage";
import { statusConfig, getInitials, formatPhone } from "@/lib/chat-utils";
import type { ConversationWithContact } from "@/hooks/useConversations";
import type { ConversationStatus } from "@/lib/chat-utils";
import MessageBubble from "./MessageBubble";
import DropZone from "./DropZone";

interface MessageAreaProps {
  conversation: ConversationWithContact;
  onFileDrop?: (file: File) => void;
}

export default function MessageArea({ conversation, onFileDrop }: MessageAreaProps) {
  const { data: messages, isLoading } = useMessages(conversation.id);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markAsRead = useMarkAsRead();

  useRealtimeMessages(conversation.id);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversation.unread_count > 0) {
      markAsRead.mutate(conversation.id);
    }
  }, [conversation.id]);

  const status = conversation.status as ConversationStatus;
  const cfg = statusConfig[status] || statusConfig.unassigned;

  const messagesContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3 bg-card">
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
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {formatPhone(conversation.contacts.phone)}
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.class}`}
              >
                {cfg.label}
              </span>
            </div>
          </div>
        </div>
        <button className="rounded-lg p-2 hover:bg-secondary transition-colors">
          <MoreVertical className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4 bg-secondary/30">
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
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>
    </>
  );

  if (onFileDrop) {
    return (
      <DropZone onFileDrop={onFileDrop}>
        {messagesContent}
      </DropZone>
    );
  }

  return <>{messagesContent}</>;
}
```

- [ ] **Step 3: Atualizar MessageInput.tsx — integrar AttachmentMenu**

Substituir o conteúdo de `src/components/chat/MessageInput.tsx`:

```tsx
// src/components/chat/MessageInput.tsx
import { useState } from "react";
import { Send, Smile } from "lucide-react";
import { useSendMessage } from "@/hooks/useSendMessage";
import { toast } from "sonner";
import AttachmentMenu from "./AttachmentMenu";

interface MessageInputProps {
  conversationId: string;
  onFileSelected?: (file: File) => void;
}

export default function MessageInput({
  conversationId,
  onFileSelected,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const sendMessage = useSendMessage();

  const handleSend = () => {
    const content = message.trim();
    if (!content) return;

    setMessage("");
    sendMessage.mutate(
      { conversation_id: conversationId, content },
      {
        onError: (err) => {
          toast.error("Erro ao enviar mensagem: " + (err as Error).message);
          setMessage(content);
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
    <div className="border-t bg-card p-4">
      <div className="flex items-center gap-2">
        <AttachmentMenu
          onFileSelected={onFileSelected || (() => {})}
          onLocationClick={() => {}}
          onContactClick={() => {}}
        />
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          className="flex-1 rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button className="rounded-lg p-2 hover:bg-secondary transition-colors text-muted-foreground">
          <Smile className="h-5 w-5" />
        </button>
        <button
          onClick={handleSend}
          disabled={!message.trim() || sendMessage.isPending}
          className="rounded-lg bg-primary p-2.5 text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: build sem erros

- [ ] **Step 5: Commit**

```bash
git add src/pages/Chat.tsx src/components/chat/MessageArea.tsx src/components/chat/MessageInput.tsx
git commit -m "feat(chat): integrar upload de arquivos com AttachmentMenu, DropZone e FilePreviewModal"
```

---

## Task 6: Emoji Picker no input

**Files:**
- Modify: `src/components/chat/MessageInput.tsx`

- [ ] **Step 1: Instalar emoji-mart**

Run: `npm install @emoji-mart/react @emoji-mart/data`

- [ ] **Step 2: Adicionar emoji picker ao MessageInput**

No `src/components/chat/MessageInput.tsx`, adicionar import e estado:

Adicionar imports no topo:
```tsx
import { useRef } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

Mudar `useState` import para incluir `useRef`:
```tsx
import { useState, useRef } from "react";
```

Dentro do componente, antes do return, adicionar:
```tsx
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEmojiSelect = (emoji: { native: string }) => {
    setMessage((prev) => prev + emoji.native);
    inputRef.current?.focus();
  };
```

Adicionar `ref={inputRef}` no `<input>`.

Substituir o botão Smile por:
```tsx
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
```

- [ ] **Step 3: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/MessageInput.tsx package.json package-lock.json
git commit -m "feat(chat): emoji picker com @emoji-mart/react no input de mensagens"
```

---

## Task 7: Hook useAudioRecorder + componente AudioRecorder

**Files:**
- Create: `src/hooks/useAudioRecorder.ts`
- Create: `src/components/chat/AudioRecorder.tsx`

- [ ] **Step 1: Criar hook useAudioRecorder**

```typescript
// src/hooks/useAudioRecorder.ts
import { useState, useRef, useCallback, useEffect } from "react";

interface AudioRecorderState {
  recording: boolean;
  elapsed: number;
  blob: Blob | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecorderState>({
    recording: false,
    elapsed: 0,
    blob: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
        setState((s) => ({ ...s, recording: false, blob }));
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setState({ recording: true, elapsed: 0, blob: null });

      timerRef.current = setInterval(() => {
        setState((s) => ({ ...s, elapsed: s.elapsed + 1 }));
      }, 1000);
    } catch {
      throw new Error("Permissão de microfone negada");
    }
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setState({ recording: false, elapsed: 0, blob: null });
  }, []);

  const reset = useCallback(() => {
    setState({ recording: false, elapsed: 0, blob: null });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { ...state, start, stop, cancel, reset };
}
```

- [ ] **Step 2: Criar componente AudioRecorder**

```tsx
// src/components/chat/AudioRecorder.tsx
import { Trash2, CheckCircle, Mic } from "lucide-react";

interface AudioRecorderProps {
  recording: boolean;
  elapsed: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AudioRecorder({
  recording,
  elapsed,
  onStart,
  onStop,
  onCancel,
}: AudioRecorderProps) {
  if (!recording) {
    return (
      <button
        onClick={onStart}
        className="rounded-lg p-2 hover:bg-secondary transition-colors text-muted-foreground"
        title="Gravar áudio"
      >
        <Mic className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 bg-destructive/10 rounded-lg px-3 py-1.5">
      <button
        onClick={onCancel}
        className="rounded-full p-1.5 hover:bg-destructive/20 text-destructive transition-colors"
        title="Cancelar gravação"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 flex-1">
        <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-mono text-destructive">
          {formatTime(elapsed)}
        </span>
      </div>

      <button
        onClick={onStop}
        className="rounded-full p-1.5 hover:bg-primary/20 text-primary transition-colors"
        title="Parar e enviar"
      >
        <CheckCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAudioRecorder.ts src/components/chat/AudioRecorder.tsx
git commit -m "feat(chat): hook useAudioRecorder + componente AudioRecorder"
```

---

## Task 8: Integrar gravação de áudio no MessageInput e Chat

**Files:**
- Modify: `src/components/chat/MessageInput.tsx`
- Modify: `src/pages/Chat.tsx`

- [ ] **Step 1: Adicionar AudioRecorder ao MessageInput**

No `src/components/chat/MessageInput.tsx`:

Adicionar import:
```tsx
import AudioRecorder from "./AudioRecorder";
```

Adicionar prop e callback:
```tsx
interface MessageInputProps {
  conversationId: string;
  onFileSelected?: (file: File) => void;
  onAudioReady?: (blob: Blob) => void;
}
```

Importar e usar o hook dentro do componente:
```tsx
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
```

Dentro do componente:
```tsx
  const recorder = useAudioRecorder();

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

  // Quando o blob estiver pronto, enviar
  useEffect(() => {
    if (recorder.blob && onAudioReady) {
      onAudioReady(recorder.blob);
      recorder.reset();
    }
  }, [recorder.blob]);
```

Adicionar `useEffect` ao import do React:
```tsx
import { useState, useRef, useEffect } from "react";
```

No JSX, entre o AttachmentMenu e o input, condicionar: se gravando, mostrar AudioRecorder no lugar do input:

```tsx
      <div className="flex items-center gap-2">
        {!recorder.recording && (
          <AttachmentMenu
            onFileSelected={onFileSelected || (() => {})}
            onLocationClick={() => {}}
            onContactClick={() => {}}
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
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="flex-1 rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
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
```

- [ ] **Step 2: Adicionar handler de áudio no Chat.tsx**

No `src/pages/Chat.tsx`, adicionar:

```tsx
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
      });
    } catch (err) {
      toast.error("Erro ao enviar áudio: " + (err as Error).message);
    }
  };
```

Passar para MessageInput:
```tsx
<MessageInput
  conversationId={selected.id}
  onFileSelected={handleFileSelected}
  onAudioReady={handleAudioReady}
/>
```

- [ ] **Step 3: Atualizar edge function para enviar voz com convert:true**

No `supabase/functions/whatsapp-messages/index.ts`, dentro do bloco `send-media` onde monta o body para WAHA, adicionar `convert: true` quando `media_type === "audio"`:

Trocar:
```typescript
      await wahaJson(`/api/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({
          session: wahaSession,
          chatId,
          file: { url: media_url },
          caption: caption || "",
        }),
      });
```

Por:
```typescript
      const wahaBody: Record<string, unknown> = {
        session: wahaSession,
        chatId,
        file: { url: media_url },
      };
      if (media_type === "audio") {
        wahaBody.convert = true;
      } else {
        wahaBody.caption = caption || "";
      }
      await wahaJson(`/api/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(wahaBody),
      });
```

- [ ] **Step 4: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/MessageInput.tsx src/pages/Chat.tsx supabase/functions/whatsapp-messages/index.ts
git commit -m "feat(chat): integrar gravação de áudio com envio via WAHA sendVoice"
```

---

## Task 9: MessageContextMenu — Menu de contexto nas mensagens

**Files:**
- Create: `src/components/chat/MessageContextMenu.tsx`

- [ ] **Step 1: Criar MessageContextMenu**

```tsx
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
  onReact: (message: Message) => void;
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
        <ContextMenuItem onClick={() => onReact(message)}>
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
```

- [ ] **Step 2: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/MessageContextMenu.tsx
git commit -m "feat(chat): MessageContextMenu com Responder, Reagir, Encaminhar e Copiar"
```

---

## Task 10: ReplyBar + integrar reply no fluxo de envio

**Files:**
- Create: `src/components/chat/ReplyBar.tsx`
- Modify: `src/pages/Chat.tsx`
- Modify: `src/components/chat/MessageInput.tsx`
- Modify: `src/components/chat/MessageArea.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/hooks/useSendMessage.ts`
- Modify: `supabase/functions/whatsapp-messages/index.ts`

- [ ] **Step 1: Criar ReplyBar**

```tsx
// src/components/chat/ReplyBar.tsx
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
```

- [ ] **Step 2: Adicionar estado replyTo no Chat.tsx**

No `src/pages/Chat.tsx`, adicionar:

```tsx
import type { Message } from "@/hooks/useMessages";
```

Adicionar estado:
```tsx
  const [replyTo, setReplyTo] = useState<Message | null>(null);
```

Passar para MessageArea e MessageInput:
```tsx
<MessageArea
  conversation={selected}
  onFileDrop={handleFileSelected}
  onReply={setReplyTo}
/>
<MessageInput
  conversationId={selected.id}
  onFileSelected={handleFileSelected}
  onAudioReady={handleAudioReady}
  replyTo={replyTo}
  onCancelReply={() => setReplyTo(null)}
  onReplySent={() => setReplyTo(null)}
/>
```

- [ ] **Step 3: Integrar MessageContextMenu no MessageBubble**

No `src/components/chat/MessageBubble.tsx`, adicionar props:

```tsx
import MessageContextMenu from "./MessageContextMenu";

interface MessageBubbleProps {
  message: Message;
  onReply?: (message: Message) => void;
  onReact?: (message: Message) => void;
  onForward?: (message: Message) => void;
}
```

Wrap o div principal com MessageContextMenu:
```tsx
export default function MessageBubble({
  message,
  onReply,
  onReact,
  onForward,
}: MessageBubbleProps) {
  // ...existente...

  return (
    <MessageContextMenu
      message={message}
      onReply={onReply || (() => {})}
      onReact={onReact || (() => {})}
      onForward={onForward || (() => {})}
    >
      <div className={`flex ${isLead ? "justify-start" : "justify-end"}`}>
        {/* ...conteúdo existente da bolha... */}
      </div>
    </MessageContextMenu>
  );
}
```

- [ ] **Step 4: Propagar callbacks no MessageArea**

No `src/components/chat/MessageArea.tsx`, adicionar prop:
```tsx
interface MessageAreaProps {
  conversation: ConversationWithContact;
  onFileDrop?: (file: File) => void;
  onReply?: (message: Message) => void;
}
```

Importar Message type:
```tsx
import type { Message } from "@/hooks/useMessages";
```

Passar para MessageBubble:
```tsx
{messages?.map((msg) => (
  <MessageBubble
    key={msg.id}
    message={msg}
    onReply={onReply}
  />
))}
```

- [ ] **Step 5: Integrar ReplyBar e reply_to no MessageInput**

No `src/components/chat/MessageInput.tsx`, adicionar:

```tsx
import ReplyBar from "./ReplyBar";
import type { Message } from "@/hooks/useMessages";

interface MessageInputProps {
  conversationId: string;
  onFileSelected?: (file: File) => void;
  onAudioReady?: (blob: Blob) => void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  onReplySent?: () => void;
}
```

Dentro do handleSend, incluir `reply_to`:
```tsx
  const handleSend = () => {
    const content = message.trim();
    if (!content) return;

    setMessage("");
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
```

Adicionar ReplyBar acima da barra de input:
```tsx
    <div className="border-t bg-card">
      {replyTo && (
        <ReplyBar message={replyTo} onCancel={onCancelReply || (() => {})} />
      )}
      <div className="flex items-center gap-2 p-4">
        {/* ...existente... */}
      </div>
    </div>
```

- [ ] **Step 6: Atualizar useSendMessage para suportar metadata**

No `src/hooks/useSendMessage.ts`, atualizar interface e mutation:

```typescript
interface SendTextParams {
  conversation_id: string;
  content: string;
  metadata?: Record<string, unknown>;
}
```

No `mutationFn`, enviar metadata:
```typescript
    mutationFn: async (params: SendTextParams) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: params }
      );
      if (error) throw error;
      return data;
    },
```

No optimistic update, incluir metadata:
```typescript
      const optimistic: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: params.conversation_id,
        content: params.content,
        sender_type: "human",
        sender_id: user?.id || null,
        media_url: null,
        media_type: null,
        metadata: params.metadata || null,
        created_at: new Date().toISOString(),
      };
```

- [ ] **Step 7: Atualizar edge function para suportar reply_to**

No `supabase/functions/whatsapp-messages/index.ts`, no bloco de envio de texto (default), adicionar `reply_to`:

```typescript
    // Send text (default)
    const { conversation_id, content, metadata } = body;
    if (!conversation_id || !content) {
      throw new Error("conversation_id and content are required");
    }

    const conv = await getConversation(db, conversation_id, companyId);
    const chatId = getChatId(conv.contacts);

    const textBody: Record<string, unknown> = {
      session: conv.whatsapp_sessions.waha_instance_id,
      chatId,
      text: content,
    };
    if (metadata?.reply_to) {
      // reply_to in our DB is our message ID; we need the WAHA message ID
      const { data: replyMsg } = await db
        .from("messages")
        .select("metadata")
        .eq("id", metadata.reply_to)
        .single();
      if (replyMsg?.metadata?.waha_message_id) {
        textBody.reply_to = replyMsg.metadata.waha_message_id;
      }
    }

    await wahaJson(`/api/sendText`, {
      method: "POST",
      body: JSON.stringify(textBody),
    });

    const { data: message, error } = await db
      .from("messages")
      .insert({
        conversation_id,
        content,
        sender_type: "human",
        sender_id: userId,
        metadata: metadata || null,
      })
      .select()
      .single();
```

- [ ] **Step 8: Renderizar quote de reply no MessageBubble**

No `src/components/chat/MessageBubble.tsx`, antes do `renderMedia()`, adicionar renderização de quote:

```tsx
import { useMessages } from "@/hooks/useMessages";

// Dentro do componente, antes do return:
  const replyToId = (message.metadata as any)?.reply_to as string | undefined;
  const { data: allMessages } = useMessages(message.conversation_id);
  const repliedMessage = replyToId
    ? allMessages?.find((m) => m.id === replyToId)
    : null;
```

No JSX, logo após o badge de IA e antes de `{renderMedia()}`:
```tsx
        {repliedMessage && (
          <div className="rounded bg-secondary/50 border-l-2 border-primary px-2 py-1 mb-2 text-xs">
            <span className="font-medium">
              {repliedMessage.sender_type === "lead" ? "Contato" : "Você"}
            </span>
            <p className="text-muted-foreground truncate">
              {repliedMessage.content?.slice(0, 60) ||
                `[${repliedMessage.media_type}]`}
            </p>
          </div>
        )}
```

- [ ] **Step 9: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 10: Commit**

```bash
git add src/components/chat/ReplyBar.tsx src/components/chat/MessageContextMenu.tsx src/components/chat/MessageBubble.tsx src/components/chat/MessageArea.tsx src/components/chat/MessageInput.tsx src/pages/Chat.tsx src/hooks/useSendMessage.ts supabase/functions/whatsapp-messages/index.ts
git commit -m "feat(chat): menu de contexto + responder mensagem com reply_to via WAHA"
```

---

## Task 11: Reações com emoji em mensagens

**Files:**
- Create: `src/components/chat/EmojiReactionPicker.tsx`
- Modify: `src/hooks/useSendMessage.ts`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `supabase/functions/whatsapp-messages/index.ts`
- Modify: `supabase/functions/whatsapp-webhook/index.ts`

- [ ] **Step 1: Criar EmojiReactionPicker**

```tsx
// src/components/chat/EmojiReactionPicker.tsx
import { useState } from "react";
import { Plus } from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface EmojiReactionPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiReactionPicker({ onSelect }: EmojiReactionPickerProps) {
  const [showFull, setShowFull] = useState(false);

  return (
    <div className="flex items-center gap-1 p-1">
      {QUICK_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="hover:scale-125 transition-transform p-1 text-lg"
        >
          {emoji}
        </button>
      ))}
      <Popover open={showFull} onOpenChange={setShowFull}>
        <PopoverTrigger asChild>
          <button className="p-1 rounded hover:bg-secondary text-muted-foreground">
            <Plus className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-auto p-0 border-none shadow-xl">
          <Picker
            data={data}
            onEmojiSelect={(e: { native: string }) => {
              onSelect(e.native);
              setShowFull(false);
            }}
            theme="auto"
            locale="pt"
            previewPosition="none"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

- [ ] **Step 2: Adicionar useReaction ao useSendMessage.ts**

No `src/hooks/useSendMessage.ts`, adicionar:

```typescript
export function useReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      message_id: string;
      reaction: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { ...params, action: "send-reaction" } }
      );
      if (error) throw error;
      return data;
    },
    onSettled: (_data, _error, params) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", params.conversation_id],
      });
    },
  });
}
```

- [ ] **Step 3: Adicionar action send-reaction na edge function**

No `supabase/functions/whatsapp-messages/index.ts`, após o bloco `send-seen` e antes de `send-media`, adicionar:

```typescript
    // Send reaction
    if (action === "send-reaction") {
      const { conversation_id, message_id, reaction } = body;
      if (!conversation_id || !message_id) {
        throw new Error("conversation_id and message_id are required");
      }

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);

      // Get WAHA message ID
      const { data: msg } = await db
        .from("messages")
        .select("metadata")
        .eq("id", message_id)
        .single();

      const wahaMessageId = msg?.metadata?.waha_message_id;
      if (!wahaMessageId) throw new Error("Cannot react: no WAHA message ID");

      await wahaJson(`/api/reaction`, {
        method: "PUT",
        body: JSON.stringify({
          session: conv.whatsapp_sessions.waha_instance_id,
          chatId,
          messageId: wahaMessageId,
          reaction,
        }),
      });

      // Update metadata with reaction
      const reactions = (msg.metadata?.reactions as any[]) || [];
      const existing = reactions.findIndex((r: any) => r.sender_id === userId);
      if (reaction === "") {
        if (existing >= 0) reactions.splice(existing, 1);
      } else if (existing >= 0) {
        reactions[existing] = { emoji: reaction, sender_id: userId };
      } else {
        reactions.push({ emoji: reaction, sender_id: userId });
      }

      await db
        .from("messages")
        .update({ metadata: { ...msg.metadata, reactions } })
        .eq("id", message_id);

      return json({ ok: true });
    }
```

- [ ] **Step 4: Tratar reação recebida no webhook**

No `supabase/functions/whatsapp-webhook/index.ts`, adicionar tratamento de `message.reaction` no bloco de eventos:

```typescript
    if (event === "message") {
      await handleMessage(db, sessionName, data);
    } else if (event === "message.reaction") {
      await handleReaction(db, sessionName, data.payload);
    } else if (event === "message.ack") {
```

Adicionar a função:
```typescript
async function handleReaction(db: any, sessionName: string, payload: any) {
  const { id, reaction, from } = payload;
  if (!id) return;

  const { data: messages } = await db
    .from("messages")
    .select("id, metadata")
    .contains("metadata", { waha_message_id: id })
    .limit(1);

  if (!messages || messages.length === 0) return;

  const msg = messages[0];
  const reactions = (msg.metadata?.reactions as any[]) || [];
  const senderId = from || "contact";

  const existing = reactions.findIndex((r: any) => r.sender_id === senderId);
  if (!reaction?.text) {
    if (existing >= 0) reactions.splice(existing, 1);
  } else if (existing >= 0) {
    reactions[existing] = { emoji: reaction.text, sender_id: senderId };
  } else {
    reactions.push({ emoji: reaction.text, sender_id: senderId });
  }

  await db
    .from("messages")
    .update({ metadata: { ...msg.metadata, reactions } })
    .eq("id", msg.id);
}
```

- [ ] **Step 5: Renderizar reações no MessageBubble**

No `src/components/chat/MessageBubble.tsx`, após a bolha da mensagem (após `</div>` principal da bolha), adicionar badge de reações:

```tsx
  const reactions = (message.metadata as any)?.reactions as
    | { emoji: string; sender_id: string }[]
    | undefined;
```

No JSX, após o div da bolha e antes de fechar o `</div>` de flex:
```tsx
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
```

- [ ] **Step 6: Integrar reação no fluxo — Chat.tsx + MessageArea + MessageBubble**

No `Chat.tsx`, adicionar:
```tsx
import { useReaction } from "@/hooks/useSendMessage";

// Dentro do componente:
  const reaction = useReaction();

  const handleReact = (msg: Message, emoji: string) => {
    if (!selected) return;
    reaction.mutate({
      conversation_id: selected.id,
      message_id: msg.id,
      reaction: emoji,
    });
  };
```

Propagar para MessageArea → MessageBubble → MessageContextMenu. O `onReact` do MessageContextMenu deve abrir o EmojiReactionPicker. Isso requer que o MessageBubble gerencie um estado local para o picker:

No MessageBubble, adicionar:
```tsx
import { useState } from "react";
import EmojiReactionPicker from "./EmojiReactionPicker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

```tsx
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const handleReactClick = () => {
    setShowReactionPicker(true);
  };

  const handleEmojiReaction = (emoji: string) => {
    onReact?.(message, emoji);
    setShowReactionPicker(false);
  };
```

Alterar `onReact` prop:
```tsx
  onReact?: (message: Message, emoji: string) => void;
```

No ContextMenu, `onReact` deve chamar `handleReactClick`:
```tsx
<MessageContextMenu
  message={message}
  onReply={onReply || (() => {})}
  onReact={handleReactClick}
  onForward={onForward || (() => {})}
>
```

Atualizar MessageContextMenu para aceitar `onReact` como `() => void`:
```tsx
  onReact: (message: Message) => void;
// Chamar como:
  onReact: () => void;
```

Wrap a bolha com um Popover para o picker:
```tsx
    <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
      <MessageContextMenu ...>
        <PopoverTrigger asChild>
          <div className={`flex ${isLead ? "justify-start" : "justify-end"}`}>
            ...bolha...
          </div>
        </PopoverTrigger>
      </MessageContextMenu>
      <PopoverContent side="top" className="w-auto p-0">
        <EmojiReactionPicker onSelect={handleEmojiReaction} />
      </PopoverContent>
    </Popover>
```

Propagar no MessageArea:
```tsx
interface MessageAreaProps {
  conversation: ConversationWithContact;
  onFileDrop?: (file: File) => void;
  onReply?: (message: Message) => void;
  onReact?: (message: Message, emoji: string) => void;
}
```

```tsx
<MessageBubble
  key={msg.id}
  message={msg}
  onReply={onReply}
  onReact={onReact}
/>
```

No Chat.tsx:
```tsx
<MessageArea
  conversation={selected}
  onFileDrop={handleFileSelected}
  onReply={setReplyTo}
  onReact={handleReact}
/>
```

- [ ] **Step 7: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 8: Commit**

```bash
git add src/components/chat/EmojiReactionPicker.tsx src/components/chat/MessageBubble.tsx src/components/chat/MessageContextMenu.tsx src/components/chat/MessageArea.tsx src/pages/Chat.tsx src/hooks/useSendMessage.ts supabase/functions/whatsapp-messages/index.ts supabase/functions/whatsapp-webhook/index.ts
git commit -m "feat(chat): reações com emoji em mensagens via WAHA + webhook"
```

---

## Task 12: Encaminhar mensagens

**Files:**
- Create: `src/components/chat/ForwardModal.tsx`
- Modify: `src/hooks/useSendMessage.ts`
- Modify: `src/pages/Chat.tsx`
- Modify: `src/components/chat/MessageArea.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `supabase/functions/whatsapp-messages/index.ts`

- [ ] **Step 1: Criar ForwardModal**

```tsx
// src/components/chat/ForwardModal.tsx
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
```

- [ ] **Step 2: Adicionar useForwardMessage ao useSendMessage.ts**

```typescript
export function useForwardMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      message_id: string;
      target_conversation_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { ...params, action: "forward-message" } }
      );
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
```

- [ ] **Step 3: Adicionar action forward-message na edge function**

No `supabase/functions/whatsapp-messages/index.ts`, adicionar bloco:

```typescript
    // Forward message
    if (action === "forward-message") {
      const { conversation_id, message_id, target_conversation_id } = body;
      if (!conversation_id || !message_id || !target_conversation_id) {
        throw new Error("conversation_id, message_id, target_conversation_id required");
      }

      const sourceConv = await getConversation(db, conversation_id, companyId);
      const targetConv = await getConversation(db, target_conversation_id, companyId);
      const targetChatId = getChatId(targetConv.contacts);

      const { data: msg } = await db
        .from("messages")
        .select("metadata")
        .eq("id", message_id)
        .single();

      const wahaMessageId = msg?.metadata?.waha_message_id;
      if (!wahaMessageId) throw new Error("Cannot forward: no WAHA message ID");

      await wahaJson(`/api/forwardMessage`, {
        method: "POST",
        body: JSON.stringify({
          session: sourceConv.whatsapp_sessions.waha_instance_id,
          chatId: getChatId(sourceConv.contacts),
          messageId: wahaMessageId,
          chatIdTo: targetChatId,
        }),
      });

      return json({ ok: true });
    }
```

- [ ] **Step 4: Integrar ForwardModal no Chat.tsx**

```tsx
import ForwardModal from "@/components/chat/ForwardModal";
import { useForwardMessage } from "@/hooks/useSendMessage";

// Estado:
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
  const forwardMutation = useForwardMessage();

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
```

Propagar `onForward={setForwardMessage}` para MessageArea → MessageBubble.

Adicionar o modal:
```tsx
<ForwardModal
  open={!!forwardMessage}
  onClose={() => setForwardMessage(null)}
  onForward={handleForward}
  currentConversationId={selected?.id || ""}
  forwarding={forwardMutation.isPending}
/>
```

- [ ] **Step 5: Renderizar badge de forwarded no MessageBubble**

```tsx
  const isForwarded = (message.metadata as any)?.forwarded === true;

  // No JSX, logo após o badge de IA:
  {isForwarded && (
    <div className="flex items-center gap-1 mb-1 text-[10px] text-muted-foreground italic">
      <Forward className="h-3 w-3" /> Encaminhada
    </div>
  )}
```

Importar `Forward` do lucide-react.

- [ ] **Step 6: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/ForwardModal.tsx src/hooks/useSendMessage.ts src/pages/Chat.tsx src/components/chat/MessageArea.tsx src/components/chat/MessageBubble.tsx supabase/functions/whatsapp-messages/index.ts
git commit -m "feat(chat): encaminhar mensagens via WAHA forwardMessage"
```

---

## Task 13: Indicador de digitação (typing)

**Files:**
- Modify: `src/hooks/useSendMessage.ts`
- Modify: `src/components/chat/MessageInput.tsx`
- Modify: `supabase/functions/whatsapp-messages/index.ts`

- [ ] **Step 1: Adicionar useTypingIndicator ao useSendMessage.ts**

```typescript
export function useTypingIndicator() {
  const lastSentRef = { current: 0 };

  const sendTyping = async (conversationId: string, action: "start-typing" | "stop-typing") => {
    try {
      await supabase.functions.invoke("whatsapp-messages", {
        body: { action, conversation_id: conversationId },
      });
    } catch {
      // fire-and-forget
    }
  };

  const startTyping = (conversationId: string) => {
    const now = Date.now();
    if (now - lastSentRef.current < 3000) return;
    lastSentRef.current = now;
    sendTyping(conversationId, "start-typing");
  };

  const stopTyping = (conversationId: string) => {
    lastSentRef.current = 0;
    sendTyping(conversationId, "stop-typing");
  };

  return { startTyping, stopTyping };
}
```

- [ ] **Step 2: Adicionar actions start-typing e stop-typing na edge function**

No `supabase/functions/whatsapp-messages/index.ts`:

```typescript
    // Start typing
    if (action === "start-typing" || action === "stop-typing") {
      const { conversation_id } = body;
      if (!conversation_id) throw new Error("conversation_id is required");

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);
      const endpoint = action === "start-typing" ? "startTyping" : "stopTyping";

      await wahaJson(`/api/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({
          session: conv.whatsapp_sessions.waha_instance_id,
          chatId,
        }),
      });

      return json({ ok: true });
    }
```

- [ ] **Step 3: Integrar no MessageInput**

No `src/components/chat/MessageInput.tsx`:

```tsx
import { useTypingIndicator } from "@/hooks/useSendMessage";

// Dentro do componente:
  const typing = useTypingIndicator();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (e.target.value.trim()) {
      typing.startTyping(conversationId);
    }
  };

  // No handleSend, após setMessage(""):
  typing.stopTyping(conversationId);
```

Trocar `onChange={(e) => setMessage(e.target.value)}` por `onChange={handleChange}`.

- [ ] **Step 4: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSendMessage.ts src/components/chat/MessageInput.tsx supabase/functions/whatsapp-messages/index.ts
git commit -m "feat(chat): indicador de digitação via WAHA startTyping/stopTyping"
```

---

## Task 14: Envio de localização

**Files:**
- Create: `src/components/chat/LocationModal.tsx`
- Modify: `src/hooks/useSendMessage.ts`
- Modify: `src/components/chat/MessageInput.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `src/pages/Chat.tsx`
- Modify: `supabase/functions/whatsapp-messages/index.ts`

- [ ] **Step 1: Criar LocationModal**

```tsx
// src/components/chat/LocationModal.tsx
import { useState } from "react";
import { MapPin, Navigation, Loader2, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }) => void;
  sending: boolean;
}

export default function LocationModal({
  open,
  onClose,
  onSend,
  sending,
}: LocationModalProps) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locating, setLocating] = useState(false);

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não suportada");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toString());
        setLng(pos.coords.longitude.toString());
        setLocating(false);
      },
      (err) => {
        toast.error("Erro ao obter localização: " + err.message);
        setLocating(false);
      }
    );
  };

  const handleSend = () => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error("Latitude e longitude inválidas");
      return;
    }
    onSend({
      latitude,
      longitude,
      name: name || undefined,
      address: address || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar localização</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGeolocate}
            disabled={locating}
          >
            {locating ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Navigation className="h-4 w-4 mr-2" />
            )}
            Usar minha localização
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Latitude"
              type="number"
              step="any"
              className="rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="Longitude"
              type="number"
              step="any"
              className="rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do local (opcional)"
            className="w-full rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />

          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Endereço (opcional)"
            className="w-full rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />

          {lat && lng && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg p-2">
              <MapPin className="h-4 w-4" />
              {lat}, {lng}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSend} disabled={!lat || !lng || sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Adicionar useSendLocation ao useSendMessage.ts**

```typescript
export function useSendLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { ...params, action: "send-location" } }
      );
      if (error) throw error;
      return data;
    },
    onSettled: (_data, _error, params) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", params.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
```

- [ ] **Step 3: Adicionar action send-location na edge function**

```typescript
    // Send location
    if (action === "send-location") {
      const { conversation_id, latitude, longitude, name, address } = body;
      if (!conversation_id || latitude == null || longitude == null) {
        throw new Error("conversation_id, latitude, longitude required");
      }

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);

      await wahaJson(`/api/sendLocation`, {
        method: "POST",
        body: JSON.stringify({
          session: conv.whatsapp_sessions.waha_instance_id,
          chatId,
          latitude,
          longitude,
          name: name || "",
          address: address || "",
        }),
      });

      const locationLabel = name || address || `${latitude}, ${longitude}`;
      const { data: message, error } = await db
        .from("messages")
        .insert({
          conversation_id,
          content: locationLabel,
          sender_type: "human",
          sender_id: userId,
          media_type: "location",
          metadata: { location: { latitude, longitude, name, address } },
        })
        .select()
        .single();

      if (error) throw error;

      await db
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation_id);

      return json(message, 201);
    }
```

- [ ] **Step 4: Renderizar localização no MessageBubble**

No `src/components/chat/MessageBubble.tsx`, no `renderMedia()`, adicionar case antes do default:
```tsx
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
```

Importar `MapPin` do lucide-react.

- [ ] **Step 5: Integrar no Chat.tsx e MessageInput**

No Chat.tsx:
```tsx
import LocationModal from "@/components/chat/LocationModal";
import { useSendLocation } from "@/hooks/useSendMessage";

  const [showLocationModal, setShowLocationModal] = useState(false);
  const sendLocation = useSendLocation();

  const handleSendLocation = (location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  }) => {
    if (!selected) return;
    sendLocation.mutate(
      { conversation_id: selected.id, ...location },
      {
        onSuccess: () => setShowLocationModal(false),
        onError: (err) => toast.error("Erro: " + (err as Error).message),
      }
    );
  };
```

Passar callback para MessageInput:
```tsx
<MessageInput
  ...
  onLocationClick={() => setShowLocationModal(true)}
/>
```

Adicionar modal:
```tsx
<LocationModal
  open={showLocationModal}
  onClose={() => setShowLocationModal(false)}
  onSend={handleSendLocation}
  sending={sendLocation.isPending}
/>
```

No MessageInput, adicionar prop `onLocationClick` e passar para AttachmentMenu.

- [ ] **Step 6: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/LocationModal.tsx src/hooks/useSendMessage.ts src/pages/Chat.tsx src/components/chat/MessageInput.tsx src/components/chat/MessageBubble.tsx supabase/functions/whatsapp-messages/index.ts
git commit -m "feat(chat): envio de localização via WAHA sendLocation"
```

---

## Task 15: Envio de contato (vCard)

**Files:**
- Create: `src/components/chat/ContactPickerModal.tsx`
- Modify: `src/hooks/useSendMessage.ts`
- Modify: `src/pages/Chat.tsx`
- Modify: `src/components/chat/MessageInput.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`
- Modify: `supabase/functions/whatsapp-messages/index.ts`

- [ ] **Step 1: Criar ContactPickerModal**

```tsx
// src/components/chat/ContactPickerModal.tsx
import { useState } from "react";
import { Search, User, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ContactPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (contact: { name: string; phone: string }) => void;
  sending: boolean;
}

export default function ContactPickerModal({
  open,
  onClose,
  onSelect,
  sending,
}: ContactPickerModalProps) {
  const [search, setSearch] = useState("");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone")
        .not("phone", "is", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filtered = contacts?.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar contato</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contato..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-secondary/50 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="max-h-64 overflow-auto space-y-1">
            {isLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {filtered?.map((contact) => (
              <button
                key={contact.id}
                onClick={() =>
                  onSelect({ name: contact.name, phone: contact.phone! })
                }
                disabled={sending}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary transition-colors text-left disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Adicionar useSendContact ao useSendMessage.ts**

```typescript
export function useSendContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      contact_name: string;
      contact_phone: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { ...params, action: "send-contact" } }
      );
      if (error) throw error;
      return data;
    },
    onSettled: (_data, _error, params) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", params.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
```

- [ ] **Step 3: Adicionar action send-contact na edge function**

```typescript
    // Send contact vCard
    if (action === "send-contact") {
      const { conversation_id, contact_name, contact_phone } = body;
      if (!conversation_id || !contact_name || !contact_phone) {
        throw new Error("conversation_id, contact_name, contact_phone required");
      }

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);

      const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${contact_name}\nTEL:${contact_phone}\nEND:VCARD`;

      await wahaJson(`/api/sendContactVcard`, {
        method: "POST",
        body: JSON.stringify({
          session: conv.whatsapp_sessions.waha_instance_id,
          chatId,
          contacts: [{
            fullName: contact_name,
            organization: "",
            phoneNumber: contact_phone,
            whatsappId: contact_phone.replace(/\D/g, ""),
          }],
        }),
      });

      const { data: message, error } = await db
        .from("messages")
        .insert({
          conversation_id,
          content: contact_name,
          sender_type: "human",
          sender_id: userId,
          media_type: "contact",
          metadata: { contact: { name: contact_name, phone: contact_phone } },
        })
        .select()
        .single();

      if (error) throw error;

      await db
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation_id);

      return json(message, 201);
    }
```

- [ ] **Step 4: Renderizar contato no MessageBubble**

No `renderMedia()`, adicionar case antes do default:
```tsx
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
```

Importar `User` do lucide-react.

- [ ] **Step 5: Integrar no Chat.tsx e MessageInput**

No Chat.tsx:
```tsx
import ContactPickerModal from "@/components/chat/ContactPickerModal";
import { useSendContact } from "@/hooks/useSendMessage";

  const [showContactPicker, setShowContactPicker] = useState(false);
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
```

Passar para MessageInput:
```tsx
<MessageInput
  ...
  onContactClick={() => setShowContactPicker(true)}
/>
```

Modal:
```tsx
<ContactPickerModal
  open={showContactPicker}
  onClose={() => setShowContactPicker(false)}
  onSelect={handleSendContact}
  sending={sendContact.isPending}
/>
```

No MessageInput, adicionar prop `onContactClick` e passar para AttachmentMenu.

- [ ] **Step 6: Verificar build**

Run: `npm run build 2>&1 | head -20`
Expected: sem erros

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/ContactPickerModal.tsx src/hooks/useSendMessage.ts src/pages/Chat.tsx src/components/chat/MessageInput.tsx src/components/chat/MessageBubble.tsx supabase/functions/whatsapp-messages/index.ts
git commit -m "feat(chat): envio de contato vCard via WAHA sendContactVcard"
```

---

## Task 16: Deploy das edge functions atualizadas

**Files:** (nenhum novo — deploy apenas)

- [ ] **Step 1: Deploy whatsapp-messages**

Run: `npx supabase functions deploy whatsapp-messages --project-ref xhfpjtswcsotfdssgxsh`

- [ ] **Step 2: Deploy whatsapp-webhook**

Run: `npx supabase functions deploy whatsapp-webhook --project-ref xhfpjtswcsotfdssgxsh`

- [ ] **Step 3: Verificar build final do frontend**

Run: `npm run build`
Expected: build completo sem erros

- [ ] **Step 4: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore: ajustes finais pós-integração de todas as features de chat"
```
