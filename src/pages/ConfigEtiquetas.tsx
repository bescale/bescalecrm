import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b",
  "#ef4444", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#6366f1", "#14b8a6", "#a855f7",
];

export default function ConfigEtiquetas() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // New tag form
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [creating, setCreating] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    fetchTags();
  }, [profile?.company_id]);

  async function fetchTags() {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("tags")
      .select("id, name, color")
      .eq("company_id", profile.company_id)
      .order("name");

    if (error) {
      toast.error("Erro ao carregar etiquetas");
    } else {
      setTags(data || []);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!newName.trim() || !profile?.company_id) return;
    setCreating(true);

    const { data, error } = await supabase
      .from("tags")
      .insert({
        name: newName.trim(),
        color: newColor,
        company_id: profile.company_id,
      })
      .select("id, name, color")
      .single();

    if (error) {
      toast.error("Erro ao criar etiqueta: " + error.message);
    } else if (data) {
      toast.success("Etiqueta criada!");
      setTags((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewColor(PRESET_COLORS[0]);
      setShowForm(false);
    }
    setCreating(false);
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return;

    const { error } = await supabase
      .from("tags")
      .update({ name: editName.trim(), color: editColor })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
    } else {
      toast.success("Etiqueta atualizada!");
      setTags((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, name: editName.trim(), color: editColor } : t
        )
      );
    }
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir esta etiqueta?")) return;

    const { error } = await supabase.from("tags").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Etiqueta excluída!");
      setTags((prev) => prev.filter((t) => t.id !== id));
    }
  }

  function startEditing(tag: Tag) {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || PRESET_COLORS[0]);
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
          <h1 className="text-2xl font-bold">Etiquetas</h1>
          <p className="text-muted-foreground text-sm">
            Crie etiquetas para organizar conversas e contatos
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
          Nova etiqueta
        </button>
      ) : (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <label className="text-sm font-medium">Nome da etiqueta</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: VIP, Urgente, Novo Lead..."
            className="w-full rounded-lg border bg-secondary/50 py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />

          <label className="text-sm font-medium">Cor</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`h-7 w-7 rounded-full transition-all ${
                  newColor === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Criando..." : "Criar"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setNewName("");
              }}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tags list */}
      {tags.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhuma etiqueta criada ainda.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-border/80 transition-all"
            >
              {editingId === tag.id ? (
                <>
                  <div
                    className="h-5 w-5 rounded-full shrink-0"
                    style={{ backgroundColor: editColor }}
                  />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-lg border bg-secondary/50 py-1.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(tag.id)}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    {PRESET_COLORS.slice(0, 6).map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`h-5 w-5 rounded-full ${
                          editColor === c ? "ring-2 ring-primary" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => handleUpdate(tag.id)}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg p-1.5 hover:bg-secondary text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="h-5 w-5 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color || PRESET_COLORS[0] }}
                  />
                  <span className="flex-1 text-sm font-medium">{tag.name}</span>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${tag.color || PRESET_COLORS[0]}20`,
                      color: tag.color || PRESET_COLORS[0],
                    }}
                  >
                    {tag.name}
                  </span>
                  <button
                    onClick={() => startEditing(tag)}
                    className="rounded-lg px-3 py-1.5 text-xs border hover:bg-secondary transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    className="rounded-lg p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
