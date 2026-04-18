import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Users,
  Smartphone,
  Loader2,
  Save,
  Trash2,
  Plus,
  Settings,
  Link,
  MessageSquareText,
  Wifi,
  WifiOff,
  Power,
  PowerOff,
  Headphones,
  Eye,
  Shield,
  UserCog,
  Pencil,
  X,
  Check,
} from "lucide-react";
import {
  useAdminCompany,
  useUpdateCompany,
  useCompanyMembers,
  useUpdateMemberRole,
  useRemoveMember,
  useCompanySessions,
  useCreateSessionAdmin,
  useUpdateSession,
  useDeleteSession,
  useAdminPlans,
} from "@/hooks/useAdminData";

type Tab = "info" | "colaboradores" | "instancias";


const roleConfig: Record<string, { label: string; icon: typeof Headphones; class: string }> = {
  super_admin: { label: "Super Admin", icon: Shield, class: "bg-amber-500/15 text-amber-500" },
  admin: { label: "Admin", icon: UserCog, class: "bg-blue-500/15 text-blue-400" },
  agent: { label: "Agente", icon: Headphones, class: "bg-green-500/15 text-green-600" },
  viewer: { label: "Visualizador", icon: Eye, class: "bg-gray-500/15 text-gray-500" },
};

export default function AdminEmpresaDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("info");

  const { data: company, isLoading } = useAdminCompany(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Empresa não encontrada.</p>
      </div>
    );
  }

  const tabs: { key: Tab; icon: typeof Building2; label: string }[] = [
    { key: "info", icon: Building2, label: "Dados" },
    { key: "colaboradores", icon: Users, label: "Colaboradores" },
    { key: "instancias", icon: Smartphone, label: "Instâncias" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin")}
          className="rounded-lg p-2 hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold truncate">{company.name}</h1>
            <span
              className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ${
                company.is_active
                  ? "bg-green-500/15 text-green-500"
                  : "bg-red-500/15 text-red-500"
              }`}
            >
              {company.is_active ? "Ativa" : "Inativa"}
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {company.cnpj || "Sem CNPJ"} &middot; Plano{" "}
            {company.plan}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "info" && <CompanyInfoTab companyId={company.id} company={company} />}
      {tab === "colaboradores" && <ColaboradoresTab companyId={company.id} />}
      {tab === "instancias" && <InstanciasTab companyId={company.id} />}
    </div>
  );
}

// ── Tab: Company Info ──────────────────────────────────────

function CompanyInfoTab({
  companyId,
  company,
}: {
  companyId: string;
  company: any;
}) {
  const updateCompany = useUpdateCompany();
  const { data: plans } = useAdminPlans();

  const [name, setName] = useState(company.name || "");
  const [cnpj, setCnpj] = useState(company.cnpj || "");
  const [selectedSlug, setSelectedSlug] = useState(company.plan || "free");
  const [address, setAddress] = useState(company.address || "");
  const [businessArea, setBusinessArea] = useState(company.business_area || "");
  const [description, setDescription] = useState(company.description || "");
  const [productsServices, setProductsServices] = useState(company.products_services || "");

  function handleSave() {
    if (!name.trim()) return;
    const selectedPlan = plans?.find((p) => p.slug === selectedSlug);
    updateCompany.mutate({
      id: companyId,
      name: name.trim(),
      cnpj: cnpj.trim() || null,
      plan: selectedSlug,
      plan_id: selectedPlan?.id || undefined,
      address: address.trim() || null,
      business_area: businessArea.trim() || null,
      description: description.trim() || null,
      products_services: productsServices.trim() || null,
    } as any);
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-sm">Informações da empresa</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Nome *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0000-00"
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Plano</label>
          <div className="grid grid-cols-4 gap-2">
            {(plans || []).map((p) => (
              <button
                key={p.slug}
                onClick={() => setSelectedSlug(p.slug)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                  selectedSlug === p.slug
                    ? "border-primary bg-primary/5 text-primary"
                    : "hover:bg-secondary text-muted-foreground"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Endereço</label>
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Rua, número, cidade"
            className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Área de atuação</label>
          <input
            value={businessArea}
            onChange={(e) => setBusinessArea(e.target.value)}
            placeholder="Ex: Tecnologia, Saúde..."
            className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Descrição</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Produtos e serviços</label>
          <textarea
            value={productsServices}
            onChange={(e) => setProductsServices(e.target.value)}
            rows={3}
            className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            disabled={updateCompany.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Save className="h-4 w-4" />
            {updateCompany.isPending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>

      {/* Invite code */}
      <div className="rounded-xl border bg-card p-5 space-y-2">
        <h3 className="font-semibold text-sm">Código de convite</h3>
        {company.invite_code ? (
          <code className="block rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm font-mono tracking-wider">
            {company.invite_code}
          </code>
        ) : (
          <p className="text-xs text-muted-foreground italic">Nenhum código gerado.</p>
        )}
      </div>
    </div>
  );
}

// ── Tab: Colaboradores ─────────────────────────────────────

function ColaboradoresTab({ companyId }: { companyId: string }) {
  const { data: members, isLoading } = useCompanyMembers(companyId);
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function handleRemove(member: any) {
    if (!confirm(`Remover ${member.full_name} da empresa?`)) return;
    removeMember.mutate(member.id);
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Colaboradores ({members?.length || 0})
        </h3>
      </div>

      {members?.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <Users className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-3">Nenhum colaborador.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members?.map((member: any) => {
            const role = member.role ? roleConfig[member.role] : null;

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
                  <span className="font-medium text-sm truncate block">
                    {member.full_name}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {member.phone && (
                      <span className="text-xs text-muted-foreground">{member.phone}</span>
                    )}
                    {!member.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-500 font-medium">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>

                {/* Role */}
                <div className="relative">
                  {editingId === member.id ? (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-card border rounded-xl shadow-lg p-2 space-y-1 min-w-[160px]">
                      {Object.entries(roleConfig).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => {
                            updateRole.mutate({ userId: member.id, role: key });
                            setEditingId(null);
                          }}
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
                        onClick={() => setEditingId(null)}
                        className="w-full text-left rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingId(member.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all hover:opacity-80 ${
                        role?.class || "bg-gray-500/15 text-gray-500"
                      }`}
                    >
                      {role && <role.icon className="h-3 w-3" />}
                      {role?.label || "Sem cargo"}
                    </button>
                  )}
                </div>

                {/* Remove */}
                <button
                  onClick={() => handleRemove(member)}
                  className="rounded-lg p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remover membro"
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

// ── Tab: Instâncias WhatsApp ───────────────────────────────

function InstanciasTab({ companyId }: { companyId: string }) {
  const { data: sessions, isLoading } = useCompanySessions(companyId);
  const createSession = useCreateSessionAdmin();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  function handleCreate() {
    if (!newName.trim()) return;
    createSession.mutate(
      { companyId, name: newName.trim() },
      {
        onSuccess: () => {
          setShowCreate(false);
          setNewName("");
        },
      }
    );
  }

  function handleDelete(sessionId: string, sessionName: string) {
    if (!confirm(`Deletar a instância "${sessionName}"?`)) return;
    deleteSession.mutate(sessionId);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          Instâncias WhatsApp ({sessions?.length || 0})
        </h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova instância
        </button>
      </div>

      {/* Create */}
      {showCreate && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <label className="text-sm font-medium">Nome da instância</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Vendas, Suporte..."
            className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createSession.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createSession.isPending ? "Criando..." : "Criar"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewName("");
              }}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Sessions list */}
      {sessions?.length === 0 && !showCreate ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <Smartphone className="h-10 w-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground mt-3">Nenhuma instância.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions?.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isEditing={editingId === session.id}
              onEdit={() => setEditingId(session.id)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(data) => {
                updateSession.mutate({ id: session.id, ...data });
                setEditingId(null);
              }}
              onDelete={() => handleDelete(session.id, session.name)}
              saving={updateSession.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Session Card with inline edit ──────────────────────────

function SessionCard({
  session,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  saving,
}: {
  session: any;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: { name?: string; settings?: Record<string, unknown> }) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [editName, setEditName] = useState(session.name);
  const [editWebhook, setEditWebhook] = useState(session.webhook_url || "");
  const [editPrompt, setEditPrompt] = useState(session.prompt || "");

  function handleSave() {
    onSave({
      name: editName.trim() || undefined,
      settings: {
        ...(settings || {}),
        webhook_url: editWebhook.trim(),
        prompt: editPrompt.trim(),
      },
    });
  }

  const statusBadge =
    session.status === "connected" ? (
      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">
        <Wifi className="h-3 w-3" /> Conectado
      </span>
    ) : (
      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-600">
        <WifiOff className="h-3 w-3" /> Desconectado
      </span>
    );

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border bg-secondary/50 py-1.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          ) : (
            <h3 className="font-semibold text-sm">{session.name}</h3>
          )}
          <div className="flex items-center gap-2 mt-1">
            {statusBadge}
            {session.phone_number && (
              <span className="text-xs text-muted-foreground">{session.phone_number}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg p-2 hover:bg-green-500/10 text-green-500 transition-colors"
                title="Salvar"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={onCancelEdit}
                className="rounded-lg p-2 hover:bg-secondary text-muted-foreground transition-colors"
                title="Cancelar"
              >
                <X className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="rounded-lg p-2 hover:bg-secondary text-muted-foreground transition-colors"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={onDelete}
                className="rounded-lg p-2 hover:bg-destructive/10 text-destructive transition-colors"
                title="Deletar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editing fields */}
      {isEditing ? (
        <div className="space-y-3 border-t pt-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5" />
              Webhook URL
            </label>
            <input
              value={editWebhook}
              onChange={(e) => setEditWebhook(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5" />
              Prompt do agente
            </label>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              rows={5}
              placeholder="Defina o comportamento do agente de IA..."
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
      ) : (
        <div className="border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Webhook</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground/70 truncate">
              {session.webhook_url || "Não configurado"}
            </p>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Prompt</span>
            </div>
            <p className="text-xs text-muted-foreground/70 truncate">
              {session.prompt || "Não configurado"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
