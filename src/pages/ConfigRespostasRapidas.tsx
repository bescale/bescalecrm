import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Type,
  Image as ImageIcon,
  Mic,
  Upload,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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

const mediaTypeConfig: Record<MediaType, { label: string; icon: typeof Type }> = {
  text: { label: "Texto", icon: Type },
  image: { label: "Imagem", icon: ImageIcon },
  audio: { label: "Áudio", icon: Mic },
};

export default function ConfigRespostasRapidas() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("text");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchReplies();
  }, [profile?.company_id]);

  async function fetchReplies() {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("quick_replies")
      .select("id, title, content, shortcut, media_type, media_url")
      .eq("company_id", profile.company_id)
      .order("title");

    if (error) {
      toast.error("Erro ao carregar respostas rápidas");
    } else {
      setReplies(
        (data || []).map((r) => ({
          ...r,
          media_type: (r.media_type as MediaType) || "text",
        }))
      );
    }
    setLoading(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (mediaType === "image" && !file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (mediaType === "audio" && !file.type.startsWith("audio/")) {
      toast.error("Selecione um arquivo de áudio");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo deve ter no máximo 5MB");
      return;
    }

    setMediaFile(file);
    if (mediaType === "image") {
      setMediaPreview(URL.createObjectURL(file));
    } else {
      setMediaPreview(file.name);
    }
  }

  function resetForm() {
    setTitle("");
    setContent("");
    setShortcut("");
    setMediaType("text");
    setMediaFile(null);
    setMediaPreview(null);
    setShowForm(false);
  }

  async function handleCreate() {
    if (!title.trim() || !profile?.company_id) return;
    if (mediaType === "text" && !content.trim()) {
      toast.error("Informe o conteúdo da resposta");
      return;
    }

    setCreating(true);

    let mediaUrl: string | null = null;

    // Upload media if present
    if (mediaFile && mediaType !== "text") {
      const ext = mediaFile.name.split(".").pop();
      const filePath = `quick-replies/${profile.company_id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, mediaFile, { upsert: true });

      if (uploadError) {
        toast.error("Erro no upload: " + uploadError.message);
        setCreating(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(filePath);

      mediaUrl = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("quick_replies")
      .insert({
        title: title.trim(),
        content: content.trim() || title.trim(),
        shortcut: shortcut.trim() || null,
        media_type: mediaType,
        media_url: mediaUrl,
        company_id: profile.company_id,
      })
      .select("id, title, content, shortcut, media_type, media_url")
      .single();

    if (error) {
      toast.error("Erro ao criar: " + error.message);
    } else if (data) {
      toast.success("Resposta rápida criada!");
      setReplies((prev) =>
        [...prev, { ...data, media_type: (data.media_type as MediaType) || "text" }].sort(
          (a, b) => a.title.localeCompare(b.title)
        )
      );
      resetForm();
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir esta resposta rápida?")) return;

    const { error } = await supabase.from("quick_replies").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Resposta excluída!");
      setReplies((prev) => prev.filter((r) => r.id !== id));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/configuracoes")}
          className="rounded-lg p-2 hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Respostas Rápidas</h1>
          <p className="text-muted-foreground text-sm">
            Templates de texto, imagem e áudio para agilizar o atendimento
          </p>
        </div>
      </div>

      {/* Create */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl border border-dashed bg-card p-4 w-full text-left hover:border-primary/30 transition-all text-sm text-muted-foreground"
        >
          <Plus className="h-5 w-5" />
          Nova resposta rápida
        </button>
      ) : (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          {/* Media type selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tipo</label>
            <div className="flex gap-2">
              {(Object.entries(mediaTypeConfig) as [MediaType, typeof mediaTypeConfig[MediaType]][]).map(
                ([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setMediaType(key);
                      setMediaFile(null);
                      setMediaPreview(null);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-medium transition-all ${
                      mediaType === key
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:bg-secondary text-muted-foreground"
                    }`}
                  >
                    <cfg.icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Título *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Saudação, Preço, Endereço..."
              className="w-full rounded-lg border bg-secondary/50 py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Shortcut */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Atalho <span className="text-muted-foreground">(opcional)</span>
            </label>
            <input
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              placeholder="Ex: /oi, /preco, /end"
              className="w-full rounded-lg border bg-secondary/50 py-2 px-4 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Content (for text) */}
          {mediaType === "text" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mensagem *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Digite o conteúdo da resposta rápida..."
                rows={4}
                className="w-full rounded-lg border bg-secondary/50 py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          )}

          {/* File upload (for image/audio) */}
          {mediaType !== "text" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                {mediaType === "image" ? "Imagem" : "Áudio"} *
              </label>
              {mediaPreview ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-secondary/30">
                  {mediaType === "image" ? (
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-sm">
                      <Mic className="h-4 w-4 text-primary" />
                      <span className="truncate">{mediaPreview}</span>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setMediaFile(null);
                      setMediaPreview(null);
                    }}
                    className="ml-auto rounded-lg p-1.5 hover:bg-secondary"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 w-full rounded-lg border border-dashed bg-secondary/30 p-4 text-sm text-muted-foreground hover:border-primary/30 transition-all"
                >
                  <Upload className="h-4 w-4" />
                  Selecionar {mediaType === "image" ? "imagem" : "áudio"}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={mediaType === "image" ? "image/*" : "audio/*"}
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Optional caption */}
              <div className="space-y-1.5 pt-1">
                <label className="text-sm font-medium">
                  Legenda <span className="text-muted-foreground">(opcional)</span>
                </label>
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Legenda da mídia..."
                  className="w-full rounded-lg border bg-secondary/50 py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Criando..." : "Criar"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Replies list */}
      {replies.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma resposta rápida criada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {replies.map((reply) => {
            const cfg = mediaTypeConfig[reply.media_type] || mediaTypeConfig.text;
            return (
              <div
                key={reply.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-4 hover:border-border/80 transition-all"
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                    reply.media_type === "image"
                      ? "bg-blue-500/10"
                      : reply.media_type === "audio"
                      ? "bg-purple-500/10"
                      : "bg-green-500/10"
                  }`}
                >
                  <cfg.icon
                    className={`h-4 w-4 ${
                      reply.media_type === "image"
                        ? "text-blue-500"
                        : reply.media_type === "audio"
                        ? "text-purple-500"
                        : "text-green-500"
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{reply.title}</span>
                    {reply.shortcut && (
                      <code className="text-[10px] px-1.5 py-0.5 rounded bg-secondary font-mono text-muted-foreground">
                        {reply.shortcut}
                      </code>
                    )}
                  </div>
                  {reply.content && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {reply.content}
                    </p>
                  )}
                  {reply.media_url && reply.media_type === "image" && (
                    <img
                      src={reply.media_url}
                      alt={reply.title}
                      className="h-12 w-12 rounded-lg object-cover mt-1"
                    />
                  )}
                </div>

                <button
                  onClick={() => handleDelete(reply.id)}
                  className="rounded-lg p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
