# Chat WAHA — Envio de Mídias, Arquivos, Emojis, Áudio e Ações

**Data:** 2026-03-29
**Abordagem:** Incremental por feature (edge function + hook + UI por ciclo)

---

## 1. Upload de Mídias/Arquivos + Drag-and-Drop

### UI (MessageInput.tsx)
- Botão Paperclip abre dropdown com opções: `Imagem/Vídeo`, `Documento`, `Localização`, `Contato`
- Cada opção abre file picker do sistema com filtro de MIME types:
  - Imagem/Vídeo: `image/*`, `video/mp4`, `video/3gpp`
  - Documento: `application/pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.zip`, `.txt`

### Drag-and-Drop (MessageArea.tsx)
- Drop zone sobre a área de mensagens com overlay visual ("Solte o arquivo aqui")
- Detecta tipo automaticamente pelo MIME type do arquivo

### Preview antes de enviar
- Imagens/vídeos: preview com thumbnail + campo de caption opcional
- Documentos: nome do arquivo + tamanho + campo de caption
- Botões: Cancelar / Enviar

### Fluxo de envio
1. Arquivo selecionado → upload para Supabase Storage (`chat-media` bucket)
2. URL pública gerada → chama `useSendMedia` com `media_url`, `media_type`, `caption`
3. Edge function `whatsapp-messages` já roteia para endpoint WAHA correto (`sendImage`, `sendVideo`, `sendFile`)

### Limite
- 50MB (já configurado no bucket)

---

## 2. Emoji Picker + Reações

### Emoji Picker (MessageInput.tsx)
- Lib: `@emoji-mart/react` + `@emoji-mart/data`
- Botão Smile abre popover posicionado acima do input
- Ao selecionar emoji, insere no cursor do texto (concatena, não substitui)
- Suporta: categorias, busca por texto, skin tones, emojis recentes

### Reações em mensagens (MessageBubble.tsx)
- Menu de contexto (botão direito) inclui opção "Reagir" que abre mini emoji picker (6-8 emojis rápidos + botão "+" para picker completo)
- Reação aparece como badge pequeno abaixo da bolha da mensagem
- 1 reação por usuário por mensagem (substituir se reagir novamente, remover se clicar na mesma)

### Backend
- Nova action `send-reaction` na edge function `whatsapp-messages`
- Chama `POST /api/reaction` do WAHA com `{ session, chatId, messageId, reaction }`
- Reaction vazia (`""`) remove a reação
- Armazenar reação em `metadata.reactions: [{ emoji, sender_id }]`

### Webhook
- Tratar evento de reação recebida em `whatsapp-webhook`
- Atualizar `metadata.reactions` na mensagem correspondente

---

## 3. Gravação de Áudio

### UI (MessageInput.tsx)
- Botão de microfone à direita do input (ao lado do botão de enviar)
- Clique inicia gravação: input substituído por barra com timer (00:00), onda visual simples, botão Cancelar (lixeira), botão Parar/Enviar (check)
- Check para e envia; lixeira descarta

### Captura de áudio
- `MediaRecorder` API nativa com `audio/webm;codecs=opus`
- Permissão via `navigator.mediaDevices.getUserMedia({ audio: true })`
- Se permissão negada, toast de erro

### Fluxo de envio
1. `MediaRecorder.stop()` → gera `Blob`
2. Upload para Supabase Storage como `audio/{uuid}.webm`
3. `useSendMedia` com `media_type: "audio"`
4. Edge function → `POST /api/sendVoice` com `convert: true` (WAHA converte webm→ogg/opus)

### Sem dependências externas
- Usa apenas APIs nativas do browser

---

## 4. Menu de Contexto (Responder, Encaminhar, Reagir)

### UI (MessageBubble.tsx)
- Botão direito na mensagem abre ContextMenu customizado (Radix UI / shadcn)
- Opções:
  - **Responder** — abre barra de reply no MessageInput
  - **Reagir** — abre mini emoji picker inline
  - **Encaminhar** — abre modal para selecionar conversa destino
  - **Copiar texto** — copia conteúdo para clipboard (apenas texto)

### Responder mensagem
- Barra acima do input com preview da mensagem original (nome remetente + trecho) + botão X para cancelar
- Ao enviar, passa `reply_to: messageId` no payload
- Edge function repassa `reply_to` para endpoints WAHA (`sendText`, `sendImage`, etc.)
- `MessageBubble` renderiza quote da mensagem original acima do conteúdo
- `reply_to` salvo em `metadata.reply_to`

### Encaminhar mensagem
- Modal com lista de conversas (reutiliza dados do ConversationList)
- Busca por nome/telefone do contato
- Nova action `forward-message` na edge function
- `POST /api/forwardMessage` com `{ session, chatId, messageId, forwardChatId }`
- Mensagens encaminhadas marcadas com `metadata.forwarded: true`

---

## 5. Indicador de Digitação + Envio de Localização + Envio de Contato

### Indicador de digitação
- Ao digitar no input → `POST /api/startTyping` via edge function (action `start-typing`)
- Debounce de 3 segundos
- Ao enviar ou limpar input → `POST /api/stopTyping` (action `stop-typing`)
- Fire-and-forget, sem persistência no banco

### Envio de Localização
- Opção "Localização" no dropdown do Paperclip
- Modal com:
  - Campos de latitude e longitude (input manual)
  - Botão "Usar minha localização" (`navigator.geolocation.getCurrentPosition()`)
  - Campo opcional de nome/endereço
  - Preview com coordenadas
- Action `send-location` na edge function → `POST /api/sendLocation`
- Payload: `{ session, chatId, location: { latitude, longitude, name, address } }`
- Salva com `media_type: "location"` e `metadata.location`
- `MessageBubble` renderiza com ícone de pin + endereço/coordenadas

### Envio de Contato (vCard)
- Opção "Contato" no dropdown do Paperclip
- Modal com lista de contatos do CRM (busca por nome/telefone)
- Action `send-contact` na edge function → `POST /api/sendContactVcard`
- `MessageBubble` renderiza com ícone de contato + nome + telefone

---

## Arquivos impactados

### Frontend (criar/modificar)
| Arquivo | Ação |
|---------|------|
| `src/components/chat/MessageInput.tsx` | Modificar — Paperclip dropdown, emoji picker, gravação áudio, barra reply, typing indicator |
| `src/components/chat/MessageBubble.tsx` | Modificar — ContextMenu, reações badge, quote reply, location/contact render, forwarded badge |
| `src/components/chat/MessageArea.tsx` | Modificar — Drag-and-drop zone |
| `src/components/chat/FilePreviewModal.tsx` | Criar — Preview de mídia/arquivo antes de enviar |
| `src/components/chat/AudioRecorder.tsx` | Criar — Componente de gravação de áudio |
| `src/components/chat/ReplyBar.tsx` | Criar — Barra de reply acima do input |
| `src/components/chat/ForwardModal.tsx` | Criar — Modal de encaminhamento |
| `src/components/chat/LocationModal.tsx` | Criar — Modal de envio de localização |
| `src/components/chat/ContactPickerModal.tsx` | Criar — Modal de seleção de contato |
| `src/components/chat/EmojiReactionPicker.tsx` | Criar — Mini picker de reações rápidas |

### Hooks (criar/modificar)
| Arquivo | Ação |
|---------|------|
| `src/hooks/useSendMessage.ts` | Modificar — adicionar `useReaction`, `useForwardMessage`, `useSendLocation`, `useSendContact`, `useTypingIndicator` |
| `src/hooks/useAudioRecorder.ts` | Criar — lógica de MediaRecorder + timer |
| `src/hooks/useFileUpload.ts` | Criar — upload para Supabase Storage + URL pública |

### Edge Functions (modificar)
| Arquivo | Ação |
|---------|------|
| `supabase/functions/whatsapp-messages/index.ts` | Modificar — actions: `send-reaction`, `forward-message`, `send-location`, `send-contact`, `start-typing`, `stop-typing`; suporte a `reply_to` |
| `supabase/functions/whatsapp-webhook/index.ts` | Modificar — tratar eventos de reação recebida |

### Dependências npm
| Pacote | Propósito |
|--------|-----------|
| `@emoji-mart/react` | Emoji picker UI |
| `@emoji-mart/data` | Dataset de emojis |

---

## Ordem de implementação

1. Upload de mídias/arquivos + drag-and-drop + preview
2. Emoji picker no input
3. Gravação de áudio
4. Menu de contexto + responder + copiar
5. Reações em mensagens
6. Encaminhar mensagens
7. Indicador de digitação
8. Envio de localização
9. Envio de contato (vCard)
