import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Zap, Rocket, Building2, ArrowRight, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const iconMap: Record<string, React.ElementType> = {
  free: Zap,
  essential: Zap,
  advanced: Rocket,
  enterprise: Building2,
};

const iconColorMap: Record<string, { color: string; bg: string }> = {
  free: { color: "text-gray-400", bg: "bg-gray-500/10" },
  essential: { color: "text-blue-500", bg: "bg-blue-500/10" },
  advanced: { color: "text-primary", bg: "bg-primary/10" },
  enterprise: { color: "text-amber-500", bg: "bg-amber-500/10" },
};

function buildFeatureList(plan: any): string[] {
  const features: string[] = [];

  if (plan.max_whatsapp_sessions === -1) features.push("Números ilimitados");
  else features.push(`${plan.max_whatsapp_sessions} número${plan.max_whatsapp_sessions > 1 ? "s" : ""} WhatsApp`);

  if (plan.max_users === -1) features.push("Usuários ilimitados");
  else features.push(`Até ${plan.max_users} usuários`);

  features.push("CRM completo");
  features.push("Kanban de vendas");

  if (plan.ai_enabled) features.push("Agente IA para atendimento");
  if (plan.priority_support) features.push("Suporte prioritário");
  if (plan.custom_branding) features.push("Marca personalizada");
  if (plan.api_access) features.push("Acesso à API");

  return features;
}

export default function Planos() {
  const { session, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (authLoading || plansLoading) return null;
  if (!session) return <Navigate to="/login" replace />;

  // If user already has a company with a paid plan, skip to dashboard
  if (profile?.company_id) return <Navigate to="/" replace />;

  // Only show non-free plans for the subscription page
  const visiblePlans = plans?.filter((p) => p.slug !== "free") || [];

  const handleSelectPlan = async (plan: { id: string; slug: string }) => {
    setSelected(plan.id);
    setSubmitting(true);

    if (plan.slug === "enterprise") {
      window.open(
        "https://wa.me/5511999999999?text=Olá! Tenho interesse no plano Enterprise do Bescale.",
        "_blank"
      );
      setSubmitting(false);
      return;
    }

    // Passa o UUID do plano para o checkout
    navigate("/checkout", { state: { selectedPlan: plan.id } });
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-5xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <img
            src="/logo-bescale.png"
            alt="Bescale"
            className="mx-auto h-14 w-auto object-contain drop-shadow-[0_0_24px_hsl(172_66%_50%/0.25)]"
          />
          <h1 className="text-3xl font-bold tracking-tight">Escolha seu plano</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Selecione o plano ideal para o seu negócio. Você pode alterar a qualquer momento.
          </p>
        </div>

        {/* Plans grid */}
        <div className={`grid grid-cols-1 gap-5 ${
          visiblePlans.length === 3 ? "md:grid-cols-3" :
          visiblePlans.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" :
          "md:grid-cols-1 max-w-lg mx-auto"
        }`}>
          {visiblePlans.map((plan, index) => {
            const Icon = iconMap[plan.slug] || Zap;
            const colors = iconColorMap[plan.slug] || iconColorMap.essential;
            const isSelected = selected === plan.id;
            const isHighlight = index === 1 && visiblePlans.length >= 3;
            const features = buildFeatureList(plan);

            const sessionsLabel = plan.max_whatsapp_sessions === -1
              ? "Customizado"
              : `${plan.max_whatsapp_sessions} número${plan.max_whatsapp_sessions > 1 ? "s" : ""}`;

            const usersLabel = plan.max_users === -1
              ? "Ilimitado"
              : `Até ${plan.max_users} usuários`;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-card p-6 flex flex-col transition-all duration-200 ${
                  isHighlight
                    ? "border-primary/50 shadow-[0_0_30px_hsl(172_66%_50%/0.12)]"
                    : "border-border"
                } ${isSelected ? "ring-2 ring-primary" : "hover:border-primary/30"}`}
              >
                {isHighlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                      Mais popular
                    </span>
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`h-11 w-11 rounded-xl ${colors.bg} flex items-center justify-center`}
                  >
                    <Icon className={`h-5.5 w-5.5 ${colors.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {sessionsLabel} · {usersLabel}
                    </p>
                  </div>
                </div>

                {/* Description */}
                {plan.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                    {plan.description}
                  </p>
                )}

                {/* Price */}
                <div className="mb-5">
                  <span className="text-3xl font-bold tracking-tight">{plan.price_label}</span>
                  {plan.price > 0 && (
                    <span className="text-sm text-muted-foreground ml-1">/mês</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={submitting && isSelected}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 ${
                    isHighlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_hsl(172_66%_50%/0.3)] hover:shadow-[0_0_24px_hsl(172_66%_50%/0.45)]"
                      : plan.slug === "enterprise"
                        ? "border border-border bg-card text-foreground hover:bg-secondary"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {submitting && isSelected ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {plan.slug === "enterprise" ? "Falar com vendas" : "Começar agora"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          Todos os planos incluem 7 dias de teste grátis. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}
