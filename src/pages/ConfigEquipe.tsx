import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  User,
  Copy,
  Check,
  Loader2,
  UserPlus,
  Mail,
  Eye,
  Headphones,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type AppRole = "agent" | "viewer";

interface TeamMember {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  role: AppRole | null;
}

const roleConfig: Record<
  AppRole,
  { label: string; icon: typeof Headphones; class: string; description: string }
> = {
  agent: {
    label: "Agente",
    icon: Headphones,
    class: "bg-green-500/15 text-green-600",
    description: "Responde ao chat e assume conversas",
  },
  viewer: {
    label: "Visualizador",
    icon: Eye,
    class: "bg-gray-500/15 text-gray-500",
    description: "Visão limitada, apenas leitura",
  },
};

/** Extract the real error message from a supabase.functions.invoke response.
 *  supabase-js v2.100+ stores the raw Response object in error.context (FunctionsHttpError).
 *  We need to call .json() on it to read the body.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractInvokeError(data: unknown, error: any): Promise<string> {
  // 1. Some supabase-js versions populate data even on error
  if (typeof data === "object" && data !== null && "error" in data) {
    return (data as { error: string }).error;
  }

  // 2. FunctionsHttpError stores raw Response in error.context (v2.100+)
  if (error?.context) {
    const ctx = error.context;
    if (ctx instanceof Response) {
      try {
        const body = await ctx.json();
        if (body?.error) return body.error;
      } catch { /* body already consumed or not JSON */ }
    } else if (typeof ctx === "object" && ctx?.error) {
      return ctx.error;
    } else if (typeof ctx === "string") {
      try {
        const parsed = JSON.parse(ctx);
        if (parsed?.error) return parsed.error;
      } catch { /* not JSON */ }
      return ctx;
    }
  }

  // 3. Try parsing error.message as JSON (older versions)
  if (error?.message && error.message !== "Edge Function returned a non-2xx status code") {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed?.error) return parsed.error;
    } catch { /* not JSON */ }
    return error.message;
  }

  return "Erro ao enviar convite. Verifique o console (F12) para detalhes.";
}

export default function ConfigEquipe() {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("agent");
  const [sending, setSending] = useState(false);

  // Role editing
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchMembers();
      fetchInviteCode();
    } else {
      setLoading(false);
    }
  }, [profile?.company_id]);

  /* ── Data fetching ─────────────────────────────────── */

  async function fetchInviteCode() {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from("companies")
      .select("invite_code")
      .eq("id", profile.company_id)
      .single();
    setInviteCode(data?.invite_code ?? null);
  }

  async function fetchMembers() {
    if (!profile?.company_id) return;

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, phone, is_active, created_at")
      .eq("company_id", profile.company_id)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar equipe");
      setLoading(false);
      return;
    }

    // Use SECURITY DEFINER RPC to get all roles (bypasses RLS)
    const { data: roles } = await supabase.rpc("get_company_team_roles");

    const roleMap = new Map<string, AppRole>();
    if (roles) {
      (roles as { user_id: string; role: string }[]).forEach((r) =>
        roleMap.set(r.user_id, r.role as AppRole),
      );
    }

    const membersWithRoles: TeamMember[] = profiles.map((p) => ({
      ...p,
      role: roleMap.get(p.id) || null,
    }));

    setMembers(membersWithRoles);
    setLoading(false);
  }

  /* ── Invite ────────────────────────────────────────── */

  function handleCopyInviteCode() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Código de convite copiado!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendInvite() {
    const name = inviteName.trim();
    const email = inviteEmail.trim();
    if (!name) {
      toast.error("Informe o nome do convidado");
      return;
    }
    if (!email) {
      toast.error("Informe o email do convidado");
      return;
    }

    setSending(true);
    try {
      // Same pattern as whatsapp-messages (no custom headers — client sends JWT automatically)
      const { data, error } = await supabase.functions.invoke(
        "invite-member",
        { body: { email, name, role: inviteRole } },
      );

      if (error || data?.error) {
        const msg = await extractInvokeError(data, error);
        console.error("invite-member error:", { data, error });
        throw new Error(msg);
      }

      toast.success(data?.message || `Convite enviado para ${email}`);

      // If email couldn't be sent, show the manual link
      if (data?.invite_link) {
        await navigator.clipboard.writeText(data.invite_link);
        toast.info("Link de convite copiado para a área de transferência");
      }

      setInviteName("");
      setInviteEmail("");
      setShowInvite(false);
      fetchMembers();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Erro ao enviar convite",
      );
    } finally {
      setSending(false);
    }
  }

  /* ── Role management (via RPC — bypasses RLS) ──────── */

  async function handleChangeRole(memberId: string, newRole: AppRole) {
    const { error } = await supabase.rpc("change_member_role", {
      _target_user_id: memberId,
      _new_role: newRole,
    });

    if (error) {
      toast.error(error.message || "Erro ao alterar cargo");
    } else {
      toast.success("Cargo atualizado!");
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)),
      );
    }
    setEditingMemberId(null);
  }

  /* ── Remove member (via RPC — bypasses RLS) ────────── */

  async function handleRemoveMember(member: TeamMember) {
    if (member.id === user?.id) {
      toast.error("Você não pode remover a si mesmo");
      return;
    }

    if (!confirm(`Deseja realmente remover ${member.full_name} da equipe?`))
      return;

    const { error } = await supabase.rpc("remove_team_member", {
      _target_user_id: member.id,
    });

    if (error) {
      toast.error(error.message || "Erro ao remover membro");
    } else {
      toast.success(`${member.full_name} foi removido da equipe`);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
    }
  }

  /* ── Render helpers ────────────────────────────────── */

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
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
          <h1 className="text-2xl font-bold">Equipe</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie os membros e convites da sua equipe
          </p>
        </div>
      </div>

      {/* Invite section */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Convidar membro</h3>
          {!showInvite && (
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Convidar
            </button>
          )}
        </div>

        {showInvite && (
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Nome do convidado
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Email do convidado
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colaborador@empresa.com"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">
                Cargo
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  Object.entries(roleConfig) as [
                    AppRole,
                    (typeof roleConfig)[AppRole],
                  ][]
                ).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setInviteRole(key)}
                    className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-all ${
                      inviteRole === key
                        ? "border-primary bg-primary/5"
                        : "hover:bg-secondary"
                    }`}
                  >
                    <span
                      className={`flex items-center gap-1.5 text-xs font-medium ${
                        inviteRole === key ? "text-primary" : "text-foreground"
                      }`}
                    >
                      <cfg.icon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {cfg.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSendInvite}
                disabled={sending}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {sending ? "Enviando..." : "Enviar convite"}
              </button>
              <button
                onClick={() => {
                  setShowInvite(false);
                  setInviteName("");
                  setInviteEmail("");
                }}
                className="rounded-lg border px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Invite code */}
        {inviteCode && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              Ou compartilhe o código de convite diretamente:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border bg-secondary/50 py-2 px-4 text-sm font-mono tracking-wider">
                {inviteCode}
              </code>
              <button
                onClick={handleCopyInviteCode}
                className="rounded-lg border p-2.5 hover:bg-secondary transition-colors"
                title="Copiar código"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Team members list */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            Membros ({members.length})
          </h3>
        </div>

        {members.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mt-3">
              Nenhum membro na equipe ainda.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => {
              const role = member.role ? roleConfig[member.role] : null;
              const isCurrentUser = member.id === user?.id;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 rounded-xl border bg-card p-4 hover:border-border/80 transition-all"
                >
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full shrink-0 overflow-hidden">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                        {getInitials(member.full_name)}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">
                        {member.full_name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                          Você
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {member.email && (
                        <span className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </span>
                      )}
                      {member.email && member.phone && (
                        <span className="text-muted-foreground text-xs">·</span>
                      )}
                      {member.phone && (
                        <span className="text-xs text-muted-foreground">
                          {member.phone}
                        </span>
                      )}
                      {!member.is_active && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-medium">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Role badge */}
                  <div className="relative">
                    {editingMemberId === member.id ? (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card border rounded-xl shadow-lg p-2 space-y-1 min-w-[160px]">
                        {(
                          Object.entries(roleConfig) as [
                            AppRole,
                            (typeof roleConfig)[AppRole],
                          ][]
                        ).map(([key, cfg]) => (
                          <button
                            key={key}
                            onClick={() => handleChangeRole(member.id, key)}
                            className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs font-medium transition-all hover:bg-secondary ${
                              member.role === key ? "bg-secondary" : ""
                            }`}
                          >
                            <cfg.icon className="h-3.5 w-3.5" />
                            {cfg.label}
                          </button>
                        ))}
                        <div className="border-t my-1" />
                        <button
                          onClick={() => setEditingMemberId(null)}
                          className="w-full text-left rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingMemberId(member.id)}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all hover:opacity-80 ${
                          role?.class || "bg-gray-500/15 text-gray-500"
                        }`}
                      >
                        {role && <role.icon className="h-3 w-3" />}
                        {role?.label || "Sem cargo"}
                      </button>
                    )}
                  </div>

                  {/* Actions */}
                  {!isCurrentUser && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      className="rounded-lg p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Remover membro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
