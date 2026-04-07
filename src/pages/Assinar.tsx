import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  CreditCard,
  Check,
  Building2,
  Loader2,
  AlertCircle,
  Clock,
  PartyPopper,
  Smartphone,
  Users,
  Bot,
} from "lucide-react";
import { useSubscriptionByToken, useSignSubscription } from "@/hooks/useAdminData";

const featureList = [
  { icon: Smartphone, label: "Sessões WhatsApp" },
  { icon: Users, label: "Membros da equipe" },
  { icon: Bot, label: "Agentes de IA" },
  { icon: CreditCard, label: "Suporte prioritário" },
];

export default function Assinar() {
  const { token } = useParams<{ token: string }>();
  const { data: link, isLoading, error } = useSubscriptionByToken(token);
  const signSubscription = useSignSubscription();
  const [signed, setSigned] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !link) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center space-y-4">
          <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-xl font-bold">Link inválido</h1>
          <p className="text-sm text-muted-foreground">
            Este link de assinatura não existe ou não é mais válido.
          </p>
        </div>
      </div>
    );
  }

  const isExpired = new Date(link.expires_at) < new Date();
  const isAlreadySigned = link.status === "accepted";
  const isLinkExpired = link.status === "expired" || isExpired;

  if (isAlreadySigned || signed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center space-y-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-green-500/15 flex items-center justify-center">
            <PartyPopper className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-xl font-bold">Assinatura confirmada!</h1>
          <p className="text-sm text-muted-foreground">
            O plano <strong className="text-foreground">{link.plan_name}</strong> foi
            ativado com sucesso para a empresa.
          </p>
          {link.signed_at && (
            <p className="text-xs text-muted-foreground">
              Assinado em {new Date(link.signed_at).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isLinkExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center space-y-4">
          <Clock className="h-12 w-12 mx-auto text-amber-500" />
          <h1 className="text-xl font-bold">Link expirado</h1>
          <p className="text-sm text-muted-foreground">
            Este link de assinatura expirou. Solicite um novo link ao administrador.
          </p>
        </div>
      </div>
    );
  }

  const company = (link as any).companies;

  function handleSign() {
    signSubscription.mutate(
      {
        linkId: link.id,
        companyId: link.company_id,
        plan: link.plan,
      },
      {
        onSuccess: () => setSigned(true),
      }
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-14 w-14 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
            <CreditCard className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Assinatura de plano</h1>
          <p className="text-sm text-muted-foreground">
            Confirme a assinatura do plano abaixo
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-6 space-y-5">
          {/* Company */}
          <div className="flex items-center gap-3 pb-4 border-b">
            <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
              {company?.logo_url ? (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building2 className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{company?.name || "Empresa"}</h3>
              <p className="text-xs text-muted-foreground">Empresa contratante</p>
            </div>
          </div>

          {/* Plan details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plano</span>
              <span className="text-sm font-semibold text-primary">{link.plan_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor mensal</span>
              <span className="text-2xl font-bold">
                {link.plan_price}
                <span className="text-xs font-normal text-muted-foreground">/mês</span>
              </span>
            </div>
          </div>

          {/* Expiration info */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <span className="text-xs text-amber-500">
              Este link expira em{" "}
              {new Date(link.expires_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          {/* CTA */}
          <button
            onClick={handleSign}
            disabled={signSubscription.isPending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {signSubscription.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Confirmar assinatura
              </>
            )}
          </button>

          <p className="text-[10px] text-center text-muted-foreground">
            Ao confirmar, o plano será ativado imediatamente para a empresa.
          </p>
        </div>
      </div>
    </div>
  );
}
