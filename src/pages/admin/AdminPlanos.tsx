import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Link2,
  Copy,
  Clock,
  ExternalLink,
  Ban,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAdminCompanies,
  useAdminPlans,
  useUpdatePlan,
  useSubscriptionLinks,
  useGenerateExternalSubscriptionLink,
  useExpireSubscriptionLink,
} from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type PlanRow = Tables<"plans">;

const featureLabels: Record<string, { label: string; icon: typeof Users }> = {
  max_whatsapp_sessions: { label: "Sessões WhatsApp", icon: Smartphone },
  max_users: { label: "Membros da equipe", icon: Users },
  max_agents: { label: "Agentes de IA", icon: Bot },
  max_contacts: { label: "Contatos", icon: Users },
  ai_enabled: { label: "IA habilitada", icon: Bot },
  priority_support: { label: "Suporte prioritário", icon: Check },
  custom_branding: { label: "Marca personalizada", icon: Check },
  api_access: { label: "Acesso à API", icon: Check },
};

const featureKeys = Object.keys(featureLabels);

const planBadgeColors: Record<string, string> = {
  free: "bg-gray-500/15 text-gray-400",
  essential: "bg-blue-500/15 text-blue-400",
  advanced: "bg-primary/15 text-primary",
  enterprise: "bg-amber-500/15 text-amber-400",
};

export default function AdminPlanos() {
  const { data: plans, isLoading: plansLoading } = useAdminPlans();
  const updatePlan = useUpdatePlan();
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editedPlan, setEditedPlan] = useState<Partial<PlanRow> | null>(null);

  const { data: companies } = useAdminCompanies();
  const { data: subscriptionLinks } = useSubscriptionLinks();
  const generateLink = useGenerateExternalSubscriptionLink();
  const expireLink = useExpireSubscriptionLink();

  // Todos os planos (templates + customizados) para resolver nomes na tabela
  const { data: allPlans } = useQuery({
    queryKey: ["all-plans-lookup"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("id, name, slug, price_label, company_id");
      return data ?? [];
    },
  });

  // Plan assignment flow
  const [generatedLink, setGeneratedLink] = useState<{ companyId: string; url: string } | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [generatingCompanyId, setGeneratingCompanyId] = useState<string | null>(null);

  function startEdit(plan: PlanRow) {
    setEditingPlan(plan.id);
    setEditedPlan({ ...plan });
  }

  function cancelEdit() {
    setEditingPlan(null);
    setEditedPlan(null);
  }

  function saveEdit() {
    if (!editedPlan || !editingPlan) return;
    const { id, created_at, updated_at, ...payload } = editedPlan as PlanRow;
    updatePlan.mutate({ id: editingPlan, ...payload }, {
      onSuccess: () => {
        setEditingPlan(null);
        setEditedPlan(null);
      },
    });
  }

  function formatLimit(value: number) {
    if (value === -1) return "Ilimitado";
    return value.toLocaleString("pt-BR");
  }

  function getCompanyCount(planId: string) {
    return companies?.filter((c) => (c as any).plan_id === planId || c.plan === planId).length || 0;
  }

  function getFeatureValue(plan: Partial<PlanRow>, key: string): boolean | number {
    return (plan as any)[key];
  }

  function setFeatureValue(key: string, value: boolean | number) {
    if (!editedPlan) return;
    setEditedPlan({ ...editedPlan, [key]: value });
  }

  async function handleGenerateLink(companyId: string) {
    const companyData = companies?.find((c) => c.id === companyId);
    const companyPlanId = (companyData as any)?.plan_id || companyData?.plan;

    // Tenta nos templates primeiro; se não achar, busca direto no banco (plano customizado)
    let planDef = plans?.find((p) => p.id === companyPlanId) ?? null;
    if (!planDef && companyPlanId) {
      const { data } = await supabase
        .from("plans")
        .select("*")
        .eq("id", companyPlanId)
        .maybeSingle();
      planDef = data;
    }

    if (!planDef) {
      toast.error("Nenhum plano vinculado a esta empresa.");
      return;
    }

    setGeneratingCompanyId(companyId);
    generateLink.mutate(
      {
        company_id: companyId,
        plan_id: planDef.id,
        plan_slug: planDef.slug,
        plan_name: planDef.name,
        plan_price: planDef.price_label,
      },
      {
        onSuccess: (data) => {
          setGeneratedLink({ companyId, url: data.link });
          setGeneratingCompanyId(null);
        },
        onError: () => {
          setGeneratingCompanyId(null);
        },
      },
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

  if (plansLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          {plans?.map((plan) => {
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
                          value={current.name || ""}
                          onChange={(e) =>
                            setEditedPlan({ ...current, name: e.target.value })
                          }
                          className="w-full rounded-lg border bg-secondary/50 py-1.5 px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <input
                          value={current.price_label || ""}
                          onChange={(e) =>
                            setEditedPlan({ ...current, price_label: e.target.value })
                          }
                          placeholder="R$ 0"
                          className="w-full rounded-lg border bg-secondary/50 py-1.5 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="font-bold text-sm">{plan.name}</h3>
                        <p className="text-xl font-bold mt-1">
                          {plan.price_label}
                          {plan.price > 0 && (
                            <span className="text-xs font-normal text-muted-foreground">
                              /mês
                            </span>
                          )}
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
                  {featureKeys.map((key) => {
                    const feat = featureLabels[key];
                    const value = getFeatureValue(current, key);
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
                              onClick={() => setFeatureValue(key, !value)}
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
                                setFeatureValue(key, parseInt(e.target.value) || 0)
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
                      disabled={updatePlan.isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {updatePlan.isPending ? "Salvando..." : "Salvar"}
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
                const companyPlanId = (company as any).plan_id;
                const companyPlanSlug = company.plan;
                // Busca por ID primeiro, depois por company_id, depois por slug
                const planDef =
                  (companyPlanId && allPlans?.find((p) => p.id === companyPlanId)) ||
                  allPlans?.find((p) => (p as any).company_id === company.id) ||
                  (companyPlanSlug && allPlans?.find((p) => p.slug === companyPlanSlug)) ||
                  null;
                const isGenerating = generatingCompanyId === company.id && generateLink.isPending;
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
                          planBadgeColors[planDef?.slug || ""] || "bg-gray-500/15 text-gray-400"
                        }`}
                      >
                        {planDef?.name || "Sem plano"}
                      </span>

                      {/* Generate link */}
                      <div>
                        <button
                          onClick={() => {
                            setGeneratedLink(null);
                            handleGenerateLink(company.id);
                          }}
                          disabled={isGenerating}
                          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all disabled:opacity-50"
                        >
                          {isGenerating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Link2 className="h-3 w-3" />
                          )}
                          {isGenerating ? "Gerando..." : "Gerar link"}
                        </button>
                      </div>
                    </div>

                    {/* Generated link display (acabou de gerar) */}
                    {justGenerated && (
                      <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                        <ExternalLink className="h-4 w-4 text-green-500 shrink-0" />
                        <code className="flex-1 text-xs font-mono text-green-400 truncate">
                          {justGenerated.url}
                        </code>
                        <a
                          href={justGenerated.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 flex items-center gap-1 rounded-lg bg-green-500/15 px-2.5 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/25 transition-colors"
                          title="Abrir link"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
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

                    {/* Link salvo na empresa (reutilizável) */}
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {!justGenerated && (company as any).subscription_link && (
                      <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/50">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Link de assinatura ativo
                            </span>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(company as any).customer_id && (
                              <span className="text-[10px] font-mono text-muted-foreground/70">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                cliente: {(company as any).customer_id}
                              </span>
                            )}
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(company as any).subscription_id && (
                              <span className="text-[10px] font-mono text-muted-foreground/70">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                assinatura: {(company as any).subscription_id}
                              </span>
                            )}
                          </div>
                          <code className="text-[10px] font-mono text-muted-foreground/70 truncate block mt-0.5">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {(company as any).subscription_link}
                          </code>
                        </div>
                        <a
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          href={(company as any).subscription_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 rounded-lg p-1.5 hover:bg-secondary text-muted-foreground transition-colors"
                          title="Abrir link"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const url = (company as any).subscription_link as string;
                            navigator.clipboard.writeText(url);
                            toast.success("Link copiado!");
                          }}
                          className="shrink-0 rounded-lg p-1.5 hover:bg-secondary text-muted-foreground transition-colors"
                          title="Copiar link"
                        >
                          <Copy className="h-3.5 w-3.5" />
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

    </div>
  );
}
