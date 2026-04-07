import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getInitials, formatPhone } from "@/lib/chat-utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  User,
  Mail,
  Phone,
  Building2,
  Star,
  Globe,
  UserCheck,
  Tag,
  FileText,
  Calendar,
  Briefcase,
  Save,
  Plus,
  X,
  Check,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import type { ConversationWithContact } from "@/hooks/useConversations";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";

// ── internal queries & mutations ────────────────────────────────────────────

function useProfiles(companyId: string | null) {
  return useQuery({
    queryKey: ["profiles", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      if (error) throw error;
      return data as { id: string; full_name: string; avatar_url: string | null }[];
    },
    enabled: !!companyId,
  });
}

function useContactTags(contactId: string) {
  return useQuery({
    queryKey: ["contact_tags", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_tags")
        .select("tag_id, tags(id, name, color)")
        .eq("contact_id", contactId);
      if (error) throw error;
      return data as { tag_id: string; tags: { id: string; name: string; color: string | null } | null }[];
    },
    enabled: !!contactId,
  });
}

function useContactOpportunities(contactId: string) {
  return useQuery({
    queryKey: ["contact_opportunities", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(`
          id, title, value, probability, expected_close_date,
          pipeline_stages(id, name, color),
          opportunity_tags(tag_id, tags(id, name, color))
        `)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!contactId,
  });
}

function useAssignConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      profileId,
    }: {
      conversationId: string;
      profileId: string | null;
    }) => {
      const { error } = await supabase
        .from("conversations")
        .update({ assigned_to: profileId })
        .eq("id", conversationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Atendente atribuído");
    },
    onError: () => toast.error("Erro ao atribuir atendente"),
  });
}

function useSaveContactNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, notes }: { contactId: string; notes: string }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ notes })
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Anotação salva");
    },
    onError: () => toast.error("Erro ao salvar anotação"),
  });
}

function useCompanyTags(companyId: string | null) {
  return useQuery({
    queryKey: ["tags", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, color")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string; color: string | null }[];
    },
    enabled: !!companyId,
  });
}

function useAddContactTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, tagId }: { contactId: string; tagId: string }) => {
      const { error } = await supabase
        .from("contact_tags")
        .insert({ contact_id: contactId, tag_id: tagId });
      if (error) throw error;
    },
    onSuccess: (_data, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: ["contact_tags", contactId] });
    },
    onError: () => toast.error("Erro ao adicionar tag"),
  });
}

function useRemoveContactTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, tagId }: { contactId: string; tagId: string }) => {
      const { error } = await supabase
        .from("contact_tags")
        .delete()
        .eq("contact_id", contactId)
        .eq("tag_id", tagId);
      if (error) throw error;
    },
    onSuccess: (_data, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: ["contact_tags", contactId] });
    },
    onError: () => toast.error("Erro ao remover tag"),
  });
}

function useUpdateContactScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contactId,
      score,
    }: {
      contactId: string;
      score: number;
    }) => {
      const { error } = await supabase
        .from("contacts")
        .update({ score })
        .eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
    },
    onError: () => toast.error("Erro ao atualizar score"),
  });
}

// ── helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

// ── section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  label,
  children,
  action,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b last:border-b-0 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </span>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

interface ContactSidebarProps {
  conversation: ConversationWithContact;
}

export default function ContactSidebar({ conversation }: ContactSidebarProps) {
  const contact = conversation.contacts;

  const [notes, setNotes] = useState(contact.notes || "");
  const [notesDirty, setNotesDirty] = useState(false);

  // Reset notes state when contact changes
  useEffect(() => {
    setNotes(contact.notes || "");
    setNotesDirty(false);
  }, [contact.id, contact.notes]);

  const { profile } = useAuth();
  const { data: allTags } = useCompanyTags(profile?.company_id || null);
  const { data: contactTags, isLoading: loadingTags } = useContactTags(contact.id);
  const { data: opportunities } = useContactOpportunities(contact.id);
  const { data: profiles } = useProfiles(profile?.company_id || null);
  const assignConversation = useAssignConversation();
  const saveNotes = useSaveContactNotes();
  const addTag = useAddContactTag();
  const removeTag = useRemoveContactTag();
  const updateScore = useUpdateContactScore();

  const [editingScore, setEditingScore] = useState(false);
  const [scoreInput, setScoreInput] = useState(String(contact.score));
  const scoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setScoreInput(String(contact.score));
    setEditingScore(false);
  }, [contact.id, contact.score]);

  const handleScoreSave = () => {
    const val = Math.max(0, Math.min(100, parseInt(scoreInput) || 0));
    updateScore.mutate({ contactId: contact.id, score: val });
    setEditingScore(false);
  };

  const handleAssign = (value: string) => {
    assignConversation.mutate({
      conversationId: conversation.id,
      profileId: value === "none" ? null : value,
    });
  };

  const handleSaveNotes = () => {
    saveNotes.mutate(
      { contactId: contact.id, notes },
      { onSuccess: () => setNotesDirty(false) }
    );
  };

  const toggleTag = (tagId: string) => {
    const isTagAdded = contactTags?.some((ct) => ct.tag_id === tagId);
    if (isTagAdded) {
      removeTag.mutate({ contactId: contact.id, tagId });
    } else {
      addTag.mutate({ contactId: contact.id, tagId });
    }
  };

  const [openTags, setOpenTags] = useState(false);

  return (
    <div className="w-[300px] border-l bg-card flex flex-col overflow-hidden hidden xl:flex">
      <div className="overflow-y-auto flex-1">

        {/* ── Avatar / Header ───────────────────────────────────── */}
        <div className="p-5 text-center border-b bg-gradient-to-b from-primary/5 to-transparent">
          {contact.custom_fields?.avatar_url ? (
            <img
              src={contact.custom_fields.avatar_url}
              alt={contact.name}
              className="h-16 w-16 rounded-full object-cover mx-auto ring-2 ring-primary/20"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto">
              {getInitials(contact.name)}
            </div>
          )}
          <h3 className="font-semibold mt-3 text-base leading-tight">{contact.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{formatPhone(contact.phone)}</p>
          {/* Score — clicável para editar manualmente */}
          {editingScore ? (
            <div className="mt-2.5 flex items-center gap-1.5 justify-center">
              <input
                ref={scoreInputRef}
                type="number"
                min={0}
                max={100}
                value={scoreInput}
                onChange={(e) => setScoreInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleScoreSave();
                  if (e.key === "Escape") setEditingScore(false);
                }}
                className="w-14 text-center text-xs font-bold bg-secondary border border-primary/40 rounded-md px-1.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
              <button
                onClick={handleScoreSave}
                className="p-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Salvar"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={() => setEditingScore(false)}
                className="p-1 rounded-md bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Cancelar"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setScoreInput(String(contact.score));
                setEditingScore(true);
              }}
              className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors group"
              title="Clique para editar o score manualmente"
            >
              <Star className="h-3 w-3 fill-current" />
              Score {contact.score}/100
              <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}
        </div>

        {/* ── Atendente ─────────────────────────────────────────── */}
        <Section icon={UserCheck} label="Atendente">
          <select
            className="w-full text-xs bg-secondary border border-border/60 rounded-md px-2.5 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 cursor-pointer"
            value={conversation.assigned_to || "none"}
            onChange={(e) => handleAssign(e.target.value)}
            disabled={assignConversation.isPending}
          >
            <option value="none">— Não atribuído —</option>
            {profiles?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </Section>

        {/* ── Informações ───────────────────────────────────────── */}
        <Section icon={User} label="Informações">
          <div className="space-y-2 text-xs">
            {contact.phone && (
              <div className="flex items-center gap-2 text-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{formatPhone(contact.phone)}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.company_name && (
              <div className="flex items-center gap-2 text-foreground">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">{contact.company_name}</span>
              </div>
            )}
            {contact.origin && (
              <div className="flex items-center gap-2 text-foreground">
                <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="capitalize">{contact.origin}</span>
              </div>
            )}
            {!contact.phone && !contact.email && !contact.company_name && !contact.origin && (
              <p className="text-muted-foreground">Sem informações adicionais</p>
            )}
          </div>
        </Section>

        {/* ── Tags ──────────────────────────────────────────────── */}
        <Section 
          icon={Tag} 
          label="Tags"
          action={
            <Popover open={openTags} onOpenChange={setOpenTags}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-semibold">
                  <Plus className="h-3 w-3" />
                  Adicionar
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Buscar tag..." className="h-8 text-xs" />
                  <CommandList>
                    <CommandEmpty className="text-xs p-2 text-center text-muted-foreground">Nemhuma tag encontrada.</CommandEmpty>
                    <CommandGroup>
                      {allTags?.map((tag) => {
                        const isSelected = contactTags?.some((ct) => ct.tag_id === tag.id);
                        return (
                          <CommandItem
                            key={tag.id}
                            onSelect={() => toggleTag(tag.id)}
                            className="text-xs cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2.5 h-2.5 rounded-full" 
                                style={{ backgroundColor: tag.color || '#10b981' }}
                              />
                              {tag.name}
                            </div>
                            {isSelected && <Check className="h-3 w-3 text-primary" />}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          }
        >
          <div className="flex flex-wrap gap-1.5 min-h-[22px]">
            {loadingTags ? (
              <span className="text-xs text-muted-foreground">Carregando tags...</span>
            ) : contactTags && contactTags.length > 0 ? (
              contactTags.map(
                (ct) =>
                  ct.tags && (
                    <span
                      key={ct.tag_id}
                      className="text-[11px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 pr-1 group"
                      style={{
                        backgroundColor: ct.tags.color ? `${ct.tags.color}18` : undefined,
                        color: ct.tags.color || undefined,
                        borderColor: ct.tags.color ? `${ct.tags.color}40` : "hsl(var(--border))",
                      }}
                    >
                      {ct.tags.name}
                      <button 
                        onClick={() => toggleTag(ct.tag_id)} 
                        className="rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )
              )
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma tag</p>
            )}
          </div>
        </Section>

        {/* ── Oportunidades ─────────────────────────────────────── */}
        <Section icon={Briefcase} label="Oportunidades">
          {opportunities && opportunities.length > 0 ? (
            <div className="space-y-2">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="rounded-lg bg-secondary/50 border border-border/40 p-3 space-y-2"
                >
                  {/* Title + Stage badge */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium leading-snug flex-1">{opp.title}</p>
                    {opp.pipeline_stages && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-semibold shrink-0 border"
                        style={{
                          backgroundColor: opp.pipeline_stages.color
                            ? `${opp.pipeline_stages.color}20`
                            : undefined,
                          color: opp.pipeline_stages.color || undefined,
                          borderColor: opp.pipeline_stages.color
                            ? `${opp.pipeline_stages.color}40`
                            : "hsl(var(--border))",
                        }}
                      >
                        {opp.pipeline_stages.name}
                      </span>
                    )}
                  </div>

                  {/* Value + Close date */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(opp.value)}
                    </span>
                    {opp.expected_close_date && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatShortDate(opp.expected_close_date)}
                      </span>
                    )}
                  </div>

                  {/* Probability bar */}
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${opp.probability}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {opp.probability}%
                    </span>
                  </div>

                  {/* Opportunity tags */}
                  {opp.opportunity_tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {opp.opportunity_tags.map((ot: any) =>
                        ot.tags ? (
                          <span
                            key={ot.tag_id}
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: ot.tags.color ? `${ot.tags.color}20` : undefined,
                              color: ot.tags.color || undefined,
                            }}
                          >
                            {ot.tags.name}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma oportunidade</p>
          )}
        </Section>

        {/* ── Anotações ─────────────────────────────────────────── */}
        <Section
          icon={FileText}
          label="Anotações"
          action={
            notesDirty ? (
              <button
                onClick={handleSaveNotes}
                disabled={saveNotes.isPending}
                className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold disabled:opacity-60"
              >
                <Save className="h-3 w-3" />
                Salvar
              </button>
            ) : null
          }
        >
          <textarea
            className="w-full text-xs bg-secondary/60 border border-border/50 rounded-md p-2.5 text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[90px]"
            placeholder="Adicione anotações sobre este contato..."
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesDirty(true);
            }}
          />
        </Section>
      </div>
    </div>
  );
}
