import { useState } from "react";
import {
  CreditCard,
  Check,
  X,
  Pencil,
  Building2,
  Users,
  Smartphone,
  Bot,
  Save,
  ChevronDown,
  Link2,
  Copy,
  Clock,
  ExternalLink,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminCompanies,
  useSubscriptionLinks,
  useCreateSubscriptionLink,
  useExpireSubscriptionLink,
} from "@/hooks/useAdminData";

interface PlanDefinition {
  id: string;
  name: string;
  price: string;
  color: string;
  features: {
    max_sessions: number;
    max_members: number;
    max_agents: number;
    max_contacts: number;
    ai_enabled: boolean;
    priority_support: boolean;
    custom_branding: boolean;
    api_access: boolean;
  };
}

const defaultPlans: PlanDefinition[] = [
  {
    id: "free",
    name: "Gratuito",
    price: "R$ 0",
    color: "bg-gray-500/15 text-gray-400 border-gray-500/20",
    features: {
      max_sessions: 1,
      max_members: 2,
      max_agents: 0,
      max_contacts: 100,
      ai_enabled: false,
      priority_support: false,
      custom_branding: false,
      api_access: false,
    },
  },
  {
    id: "starter",
    name: "Starter",
    price: "R$ 97",
    color: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    features: {
      max_sessions: 2,
      max_members: 5,
      max_agents: 1,
      max_contacts: 1000,
      ai_enabled: true,
      priority_support: false,
      custom_branding: false,
      api_access: false,
    },
  },
  {
    id: "professional",
    name: "Profissional",
    price: "R$ 197",
    color: "bg-primary/15 text-primary border-primary/20",
    features: {
      max_sessions: 5,
      max_members: 15,
      max_agents: 5,
      max_contacts: 10000,
      ai_enabled: true,
      priority_support: true,
      custom_branding: true,
      api_access: false,
    },
  },
  {
    id: "enterprise",
    name: "Empresarial",
    price: "R$ 497",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    features: {
      max_sessions: -1,
      max_members: -1,
      max_agents: -1,
      max_contacts: -1,
      ai_enabled: true,
      priority_support: true,
      custom_branding: true,
      api_access: true,
    },
  },
];

const featureLabels: Record<string, { label: string; icon: typeof Users }> = {
  max_sessions: { label: "Sessões WhatsApp", icon: Smartphone },
  max_members: { label: "Membros da equipe", icon: Users },
  max_agents: { label: "Agentes de IA", icon: Bot },
  max_contacts: { label: "Contatos", icon: Users },
  ai_enabled: { label: "IA habilitada", icon: Bot },
  priority_support: { label: "Suporte prioritário", icon: Check },
  custom_branding: { label: "Marca personalizada", icon: Check },
  api_access: { label: "Acesso à API", icon: Check },
};

const planBadgeColors: Record<string, string> = {
  free: "bg-gray-500/15 text-gray-400",
  starter: "bg-blue-500/15 text-blue-400",
  professional: "bg-primary/15 text-primary",
  enterprise: "bg-amber-500/15 text-amber-400",
};

export default function AdminPlanos() {
  const [plans, setPlans] = useState<PlanDefinition[]>(defaultPlans);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editedPlan, setEditedPlan] = useState<PlanDefinition | null>(null);

  const { data: companies } = useAdminCompanies();
  const { data: subscriptionLinks } = useSubscriptionLinks();
  const createLink = useCreateSubscriptionLink();
  const expireLink = useExpireSubscriptionLink();

  // Plan assignment flow
  const [assigningCompanyId, setAssigningCompanyId] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{ companyId: string; url: string } | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  function startEdit(plan: PlanDefinition) {
    setEditingPlan(plan.id);
    setEditedPlan({ ...plan, features: { ...plan.features } });
  }

  function cancelEdit() {
    setEditingPlan(null);
    setEditedPlan(null);
  }

  function saveEdit() {
    if (!editedPlan) return;
    setPlans((prev) => prev.map((p) => (p.id === editedPlan.id ? editedPlan : p)));
    setEditingPlan(null);
    setEditedPlan(null);
  }

  function formatLimit(value: number) {
    if (value === -1) return "Ilimitado";
    return value.toLocaleString("pt-BR");
  }

  function getCompanyCount(planId: string) {
    return companies?.filter((c) => c.plan === planId).length || 0;
  }

  function handleGenerateLink(companyId: string, planId: string) {
    const planDef = plans.find((p) => p.id === planId);
    if (!planDef) return;

    createLink.mutate(
      {
        company_id: companyId,
        plan: planId,
        plan_name: planDef.name,
        plan_price: planDef.price,
      },
      {
        onSuccess: (data) => {
          const url = `${window.location.origin}/assinar/${data.token}`;
          setGeneratedLink({ companyId, url });
          setAssigningCompanyId(null);
          navigator.clipboard.writeText(url);
          toast.success("Link copiado para a área de transferência!");
        },
      }
    );
  }

  function copyLink(url: string, linkId: string) {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(linkId);
    toast.success("Link copiado!");
    setTimeout(() => setCopiedLinkId(null), 2000);
  }

  function handleExpire(linkId: string) {
    if (!confirm("Deseja expirar este link? Ele não poderá mais ser usado.")) return;
    expireLink.mutate(linkId);
  }

  // Pending links for a company
  const pendingLinksMap = new Map<string, typeof subscriptionLinks>();
  subscriptionLinks?.forEach((link) => {
    const arr = pendingLinksMap.get(link.company_id) || [];
    arr.push(link);
    pendingLinksMap.set(link.company_id, arr);
  });

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Planos</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie os planos do sistema e gere links de assinatura para as empresas
        </p>
      </div>

      {/* Plans grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Planos do sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isEditing = editingPlan === plan.id;
            const current = isEditing && editedPlan ? editedPlan : plan;
            const companyCount = getCompanyCount(plan.id);

            return (
              <div
                key={plan.id}
                className={`rounded-xl border bg-card p-5 space-y-4 transition-all ${
                  isEditing ? "ring-2 ring-primary/30" : ""
                }`}
              >
                {/* Plan header */}
                <div className="flex items-start justify-between">
                  <div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          value={current.name}
                          onChange={(e) =>
                            setEditedPlan({ ...current, name: e.target.value })
                          }
                          className="w-full rounded-lg border bg-secondary/50 py-1.5 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          value={current.price}
                          onChange={(e) =>
                            setEditedPlan({ ...current, price: e.target.value })
                          }
                          placeholder="R$ 0"
                          className="w-full rounded-lg border bg-secondary/50 py-1.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold text-sm">{plan.name}</h3>
                        <p className="text-xl font-bold mt-1">
                          {plan.price}
                          <span className="text-xs font-normal text-muted-foreground">
                            /mês
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => startEdit(plan)}
                      className="rounded-lg p-1.5 hover:bg-secondary text-muted-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Company count badge */}
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {companyCount} empresa{companyCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Features list */}
                <div className="space-y-2 border-t pt-3">
                  {Object.entries(current.features).map(([key, value]) => {
                    const feat = featureLabels[key];
                    if (!feat) return null;
                    const isBool = typeof value === "boolean";

                    return (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <feat.icon className="h-3 w-3" />
                          {feat.label}
                        </span>
                        {isEditing ? (
                          isBool ? (
                            <button
                              onClick={() =>
                                setEditedPlan({
                                  ...current,
                                  features: {
                                    ...current.features,
                                    [key]: !value,
                                  },
                                })
                              }
                              className={`rounded-full p-0.5 transition-colors ${
                                value
                                  ? "bg-green-500/20 text-green-500"
                                  : "bg-red-500/20 text-red-500"
                              }`}
                            >
                              {value ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </button>
                          ) : (
                            <input
                              type="number"
                              value={value as number}
                              onChange={(e) =>
                                setEditedPlan({
                                  ...current,
                                  features: {
                                    ...current.features,
                                    [key]: parseInt(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-20 rounded border bg-secondary/50 py-1 px-2 text-xs text-right outline-none focus:ring-2 focus:ring-primary/30"
                            />
                          )
                        ) : isBool ? (
                          value ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-red-500/50" />
                          )
                        ) : (
                          <span className="text-xs font-medium">
                            {formatLimit(value as number)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Edit actions */}
                {isEditing && (
                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={saveEdit}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Salvar
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="rounded-lg border px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Companies plan assignment */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Plano por empresa</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_100px_110px_1fr] gap-4 px-5 py-3 border-b bg-secondary/30 text-xs font-medium text-muted-foreground">
            <span>Empresa</span>
            <span>Status</span>
            <span>Plano atual</span>
            <span>Gerar link de assinatura</span>
          </div>

          {/* Table body */}
          {companies?.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma empresa cadastrada.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {companies?.map((company) => {
                const planDef = plans.find((p) => p.id === company.plan);
                const isAssigning = assigningCompanyId === company.id;
                const justGenerated =
                  generatedLink?.companyId === company.id ? generatedLink : null;
                const companyLinks = pendingLinksMap.get(company.id)?.filter(
                  (l) => l.status === "pending"
                );

                return (
                  <div key={company.id} className="px-5 py-3.5 hover:bg-secondary/20 transition-colors">
                    <div className="grid grid-cols-[1fr_100px_110px_1fr] gap-4 items-center">
                      {/* Company name */}
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {company.name}
                        </span>
                        {company.cnpj && (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {company.cnpj}
                          </span>
                        )}
                      </div>

                      {/* Status */}
                      <span
                        className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full w-fit ${
                          company.is_active
                            ? "bg-green-500/15 text-green-500"
                            : "bg-red-500/15 text-red-500"
                        }`}
                      >
                        {company.is_active ? "Ativa" : "Inativa"}
                      </span>

                      {/* Current plan */}
                      <span
                        className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full w-fit ${
                          planBadgeColors[company.plan] || "bg-gray-500/15 text-gray-400"
                        }`}
                      >
                        {planDef?.name || company.plan}
                      </span>

                      {/* Generate link */}
                      <div className="relative">
                        {isAssigning ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            {plans
                              .filter((p) => p.id !== company.plan)
                              .map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => handleGenerateLink(company.id, p.id)}
                                  disabled={createLink.isPending}
                                  className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-secondary hover:text-foreground transition-all disabled:opacity-50"
                                >
                                  <Link2 className="h-3 w-3" />
                                  {p.name} — {p.price}
                                </button>
                              ))}
                            <button
                              onClick={() => setAssigningCompanyId(null)}
                              className="rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAssigningCompanyId(company.id);
                              setGeneratedLink(null);
                            }}
                            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                          >
                            <Link2 className="h-3 w-3" />
                            Gerar link
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Generated link display */}
                    {justGenerated && (
                      <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <ExternalLink className="h-4 w-4 text-green-500 shrink-0" />
                        <code className="flex-1 text-xs font-mono text-green-400 truncate">
                          {justGenerated.url}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(justGenerated.url);
                            toast.success("Link copiado!");
                          }}
                          className="shrink-0 flex items-center gap-1 rounded-lg bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/25 transition-colors"
                        >
                          <Copy className="h-3 w-3" />
                          Copiar
                        </button>
                      </div>
                    )}

                    {/* Pending links */}
                    {companyLinks && companyLinks.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {companyLinks.map((link) => {
                          const url = `${window.location.origin}/assinar/${link.token}`;
                          const isCopied = copiedLinkId === link.id;
                          const expiresAt = new Date(link.expires_at);
                          const isExpired = expiresAt < new Date();

                          if (isExpired) return null;

                          return (
                            <div
                              key={link.id}
                              className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/50"
                            >
                              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                    {link.plan_name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {link.plan_price}/mês
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    &middot; expira {expiresAt.toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                                <code className="text-[10px] font-mono text-muted-foreground/70 truncate block mt-0.5">
                                  {url}
                                </code>
                              </div>
                              <button
                                onClick={() => copyLink(url, link.id)}
                                className="shrink-0 rounded-lg p-1.5 hover:bg-secondary text-muted-foreground transition-colors"
                                title="Copiar link"
                              >
                                {isCopied ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleExpire(link.id)}
                                className="shrink-0 rounded-lg p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Expirar link"
                              >
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent subscription links history */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Histórico de links</h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_100px_100px_120px] gap-4 px-5 py-3 border-b bg-secondary/30 text-xs font-medium text-muted-foreground">
            <span>Empresa</span>
            <span>Plano</span>
            <span>Preço</span>
            <span>Status</span>
            <span>Criado em</span>
          </div>

          {!subscriptionLinks || subscriptionLinks.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum link gerado ainda.
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {subscriptionLinks.map((link) => {
                const statusStyles: Record<string, string> = {
                  pending: "bg-amber-500/15 text-amber-500",
                  accepted: "bg-green-500/15 text-green-500",
                  expired: "bg-red-500/15 text-red-500",
                };
                const statusLabels: Record<string, string> = {
                  pending: "Pendente",
                  accepted: "Assinado",
                  expired: "Expirado",
                };
                const companyName =
                  (link as any).companies?.name || "—";

                return (
                  <div
                    key={link.id}
                    className="grid grid-cols-[1fr_100px_100px_100px_120px] gap-4 px-5 py-3 items-center text-sm hover:bg-secondary/20 transition-colors"
                  >
                    <span className="truncate text-xs font-medium">{companyName}</span>
                    <span className="text-xs">{link.plan_name}</span>
                    <span className="text-xs text-muted-foreground">{link.plan_price}/mês</span>
                    <span
                      className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full w-fit ${
                        statusStyles[link.status] || statusStyles.pending
                      }`}
                    >
                      {statusLabels[link.status] || link.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(link.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
