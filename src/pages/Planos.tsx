import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Check, Zap, Rocket, Building2, ArrowRight, Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNote?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  features: string[];
  highlight?: boolean;
  sessions: string;
  users: string;
}

const plans: Plan[] = [
  {
    id: "essential",
    name: "Essential",
    description:
      "Para empresas que querem começar a automatizar o atendimento comercial e não perder oportunidades.",
    price: "R$ 597",
    priceNote: "/mês",
    icon: Zap,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    sessions: "1 número",
    users: "Até 3 usuários",
    features: [
      "1 número WhatsApp ativo",
      "Até 3 usuários",
      "CRM completo",
      "Kanban de vendas",
      "Agente IA para atendimento",
      "Suporte por e-mail",
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    description:
      "Para empresas que querem acelerar a conversão, retomar leads inativos e integrar o comercial de ponta a ponta.",
    price: "R$ 1.497",
    priceNote: "/mês",
    icon: Rocket,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    sessions: "2 números",
    users: "Até 5 usuários",
    highlight: true,
    features: [
      "2 números WhatsApp ativos",
      "Até 5 usuários",
      "Tudo do Essential",
      "Retomada automática de leads",
      "Integrações avançadas",
      "Suporte prioritário",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "Para empresas que precisam de acompanhamento humano contínuo e alto nível de confiabilidade.",
    price: "Sob consulta",
    icon: Building2,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    sessions: "Customizado",
    users: "Ilimitado",
    features: [
      "Números ilimitados",
      "Usuários ilimitados",
      "Tudo do Advanced",
      "Gerente de sucesso dedicado",
      "SLA garantido",
      "Variáveis customizadas",
    ],
  },
];

export default function Planos() {
  const { session, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  // If user already has a company with a paid plan, skip to dashboard
  if (profile?.company_id) return <Navigate to="/" replace />;

  const handleSelectPlan = async (planId: string) => {
    setSelected(planId);
    setSubmitting(true);

    if (planId === "enterprise") {
      // Enterprise: open WhatsApp/contact — no auto-subscription
      window.open(
        "https://wa.me/5511999999999?text=Olá! Tenho interesse no plano Enterprise do Bescale.",
        "_blank"
      );
      setSubmitting(false);
      return;
    }

    // For Essential and Advanced, proceed to onboarding
    // The actual payment integration (Asaas) will be added in the billing feature
    // For now, store the selected plan and redirect to onboarding
    navigate("/onboarding", { state: { selectedPlan: planId } });
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selected === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-card p-6 flex flex-col transition-all duration-200 ${
                  plan.highlight
                    ? "border-primary/50 shadow-[0_0_30px_hsl(172_66%_50%/0.12)]"
                    : "border-border"
                } ${isSelected ? "ring-2 ring-primary" : "hover:border-primary/30"}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground shadow-md">
                      Mais popular
                    </span>
                  </div>
                )}

                {/* Icon + Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`h-11 w-11 rounded-xl ${plan.iconBg} flex items-center justify-center`}
                  >
                    <Icon className={`h-5.5 w-5.5 ${plan.iconColor}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {plan.sessions} · {plan.users}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-5">
                  <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                  {plan.priceNote && (
                    <span className="text-sm text-muted-foreground ml-1">{plan.priceNote}</span>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={submitting && isSelected}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 ${
                    plan.highlight
                      ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_hsl(172_66%_50%/0.3)] hover:shadow-[0_0_24px_hsl(172_66%_50%/0.45)]"
                      : plan.id === "enterprise"
                        ? "border border-border bg-card text-foreground hover:bg-secondary"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {submitting && isSelected ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {plan.id === "enterprise" ? "Falar com vendas" : "Começar agora"}
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
