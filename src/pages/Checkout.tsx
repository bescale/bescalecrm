import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  CreditCard,
  User,
  Building2,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  XCircle,
  Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type PersonType = "pf" | "pj";

interface BillingData {
  personType: PersonType;
  name: string;
  document: string; // CPF or CNPJ
  email: string;
  phone: string;
  postalCode: string;
  addressLine1: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface CardData {
  holderName: string;
  number: string;
  expiry: string;
  cvv: string;
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCEP(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.replace(/(\d{2})(\d)/, "$1/$2");
}

export default function Checkout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user, profile, loading, refreshProfile } = useAuth();
  const { toast } = useToast();

  const selectedPlan = (location.state as { selectedPlan?: string })?.selectedPlan;

  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ["plan-detail", selectedPlan],
    enabled: !!selectedPlan,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("id", selectedPlan!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [personType, setPersonType] = useState<PersonType>("pj");
  const [billing, setBilling] = useState<BillingData>({
    personType: "pj",
    name: "",
    document: "",
    email: user?.email || "",
    phone: "",
    postalCode: "",
    addressLine1: "",
    addressNumber: "",
    neighborhood: "",
    city: "",
    state: "",
  });
  const [card, setCard] = useState<CardData>({
    holderName: "",
    number: "",
    expiry: "",
    cvv: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<"success" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (loading || planLoading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (!selectedPlan || !planData) return <Navigate to="/planos" replace />;

  const plan = { name: planData.name, price: planData.price_label, priceValue: planData.price };

  function updateBilling(field: keyof BillingData, value: string) {
    setBilling((prev) => ({ ...prev, [field]: value }));
  }

  function updateCard(field: keyof CardData, value: string) {
    setCard((prev) => ({ ...prev, [field]: value }));
  }

  function handlePersonTypeChange(type: PersonType) {
    setPersonType(type);
    setBilling((prev) => ({ ...prev, personType: type, document: "" }));
  }

  function handleDocumentChange(value: string) {
    const formatted = personType === "pf" ? formatCPF(value) : formatCNPJ(value);
    updateBilling("document", formatted);
  }

  function validateForm(): string | null {
    if (!billing.name.trim()) return "Informe o nome completo";
    const docDigits = billing.document.replace(/\D/g, "");
    if (personType === "pf" && docDigits.length !== 11) return "CPF inválido";
    if (personType === "pj" && docDigits.length !== 14) return "CNPJ inválido";
    if (!billing.email.trim()) return "Informe o email";
    if (!billing.phone.trim()) return "Informe o telefone";
    if (!billing.postalCode.trim()) return "Informe o CEP";
    if (!billing.addressLine1.trim()) return "Informe o endereço";
    if (!billing.addressNumber.trim()) return "Informe o número";
    if (!billing.neighborhood.trim()) return "Informe o bairro";
    if (!billing.city.trim()) return "Informe a cidade";
    if (!billing.state.trim()) return "Informe o estado";
    if (!card.holderName.trim()) return "Informe o nome no cartão";
    if (card.number.replace(/\D/g, "").length < 13) return "Número do cartão inválido";
    if (card.expiry.replace(/\D/g, "").length !== 4) return "Validade inválida";
    if (card.cvv.length < 3) return "CVV inválido";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast({ title: "Dados incompletos", description: validationError, variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        user_id: user?.id,
        company_id: profile?.company_id,
        plan_id: selectedPlan,
        billing: {
          person_type: personType,
          name: billing.name,
          document: billing.document.replace(/\D/g, ""),
          email: billing.email,
          phone: billing.phone.replace(/\D/g, ""),
          postal_code: billing.postalCode.replace(/\D/g, ""),
          address_line1: billing.addressLine1,
          address_number: billing.addressNumber,
          neighborhood: billing.neighborhood,
          city: billing.city,
          state: billing.state,
        },
        card: {
          holder_name: card.holderName,
          number: card.number.replace(/\D/g, ""),
          expiry_month: card.expiry.split("/")[0],
          expiry_year: card.expiry.split("/")[1],
          cvv: card.cvv,
        },
      };

      const response = await fetch("https://webhook.bescale.ai/webhook/bescaleplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const raw = await response.json();
      console.log("[checkout] webhook response:", raw);
      // O webhook pode retornar array direto, objeto, ou { data: [...] }
      const unwrapped = Array.isArray(raw) ? raw[0] : (raw?.data ? (Array.isArray(raw.data) ? raw.data[0] : raw.data) : raw);
      const data: Record<string, any> = unwrapped ?? {};

      // Normaliza as chaves (case-insensitive, ignora espaços) pra não
      // depender de variações exatas do webhook ("cliente id", "Cliente_Id", etc.)
      const normalized: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        normalized[k.toLowerCase().replace(/[\s_-]+/g, "")] = v;
      }

      const customerId: string | undefined =
        normalized["clienteid"] ?? normalized["customerid"];
      const subscriptionId: string | undefined =
        normalized["assinaturaid"] ?? normalized["subscriptionid"];

      // Aprovado aceita: true, "true", "TRUE", 1, "1", "sim", "yes", "aprovado"
      const approvedRaw = normalized["aprovado"] ?? normalized["approved"];
      const approvedStr = String(approvedRaw ?? "").trim().toLowerCase();
      const isApproved =
        approvedRaw === true ||
        approvedRaw === 1 ||
        ["true", "1", "sim", "yes", "aprovado", "approved"].includes(approvedStr);

      if (isApproved) {
        // Cria/atualiza a empresa + vincula plano e IDs da Asaas num único RPC.
        // Funciona tanto para usuário novo (sem company_id) quanto para
        // usuário existente trocando/renovando plano.
        const { error: rpcError } = await supabase.rpc("activate_subscription" as any, {
          _plan_id: selectedPlan,
          _company_name: billing.name,
          _cnpj: personType === "pj" ? billing.document.replace(/\D/g, "") : null,
          _customer_id: customerId ?? null,
          _subscription_id: subscriptionId ?? null,
        });

        if (rpcError) {
          console.error("[checkout] RPC activate_subscription failed:", rpcError);
          setResult("error");
          setErrorMsg(`Pagamento aprovado, mas falhou ao ativar a conta: ${rpcError.message}`);
          toast({
            title: "Pagamento aprovado, mas falhou ao ativar a conta",
            description: rpcError.message,
            variant: "destructive",
          });
          return;
        }

        // Sincroniza o AuthContext com o novo company_id antes de redirecionar,
        // senão o ProtectedRoute devolve o usuário pra /planos.
        await refreshProfile();

        setResult("success");
        setErrorMsg(null);
        setTimeout(() => {
          navigate("/", { replace: true });
        }, 2000);
      } else {
        const reason =
          normalized["retorno"] ||
          normalized["mensagem"] ||
          normalized["message"] ||
          "Verifique os dados do cartão e tente novamente.";
        setResult("error");
        setErrorMsg(`Pagamento não aprovado. ${reason}`);
        toast({
          title: "Pagamento não aprovado",
          description: reason,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("[checkout] unexpected error:", err);
      setResult("error");
      setErrorMsg(
        `Erro ao processar o pagamento: ${err instanceof Error ? err.message : String(err)}`
      );
      toast({
        title: "Erro de conexão",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (result === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold">Pagamento aprovado!</h1>
          <p className="text-sm text-muted-foreground">
            Redirecionando para a configuração da sua empresa...
          </p>
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/planos")}
            className="rounded-lg p-2 hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Checkout</h1>
            <p className="text-sm text-muted-foreground">
              Finalize a assinatura do plano {plan.name}
            </p>
          </div>
        </div>

        {/* Plan summary */}
        <div className="rounded-xl border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Plano {plan.name}</p>
              <p className="text-xs text-muted-foreground">Cobrança mensal recorrente</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{plan.price}</p>
            <p className="text-xs text-muted-foreground">/mês</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Person type */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm">Tipo de pessoa</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePersonTypeChange("pf")}
                className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                  personType === "pf"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-secondary"
                }`}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  personType === "pf" ? "bg-primary/15" : "bg-secondary"
                }`}>
                  <User className={`h-5 w-5 ${personType === "pf" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${personType === "pf" ? "text-primary" : ""}`}>
                    Pessoa Física
                  </p>
                  <p className="text-[10px] text-muted-foreground">CPF</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handlePersonTypeChange("pj")}
                className={`flex items-center gap-3 rounded-xl border p-4 transition-all ${
                  personType === "pj"
                    ? "border-primary bg-primary/5"
                    : "hover:bg-secondary"
                }`}
              >
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                  personType === "pj" ? "bg-primary/15" : "bg-secondary"
                }`}>
                  <Building2 className={`h-5 w-5 ${personType === "pj" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${personType === "pj" ? "text-primary" : ""}`}>
                    Pessoa Jurídica
                  </p>
                  <p className="text-[10px] text-muted-foreground">CNPJ</p>
                </div>
              </button>
            </div>
          </div>

          {/* Billing data */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm">Dados de faturamento</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {personType === "pf" ? "Nome completo" : "Razão social"}
                </label>
                <input
                  type="text"
                  required
                  value={billing.name}
                  onChange={(e) => updateBilling("name", e.target.value)}
                  placeholder={personType === "pf" ? "João da Silva" : "Empresa Ltda"}
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  {personType === "pf" ? "CPF" : "CNPJ"}
                </label>
                <input
                  type="text"
                  required
                  value={billing.document}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  placeholder={personType === "pf" ? "000.000.000-00" : "00.000.000/0001-00"}
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Telefone</label>
                <input
                  type="text"
                  required
                  value={billing.phone}
                  onChange={(e) => updateBilling("phone", formatPhone(e.target.value))}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email de faturamento</label>
                <input
                  type="email"
                  required
                  value={billing.email}
                  onChange={(e) => updateBilling("email", e.target.value)}
                  placeholder="financeiro@empresa.com"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">CEP</label>
                <input
                  type="text"
                  required
                  value={billing.postalCode}
                  onChange={(e) => updateBilling("postalCode", formatCEP(e.target.value))}
                  placeholder="00000-000"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Estado</label>
                <select
                  required
                  value={billing.state}
                  onChange={(e) => updateBilling("state", e.target.value)}
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Selecione</option>
                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Cidade</label>
                <input
                  type="text"
                  required
                  value={billing.city}
                  onChange={(e) => updateBilling("city", e.target.value)}
                  placeholder="São Paulo"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Bairro</label>
                <input
                  type="text"
                  required
                  value={billing.neighborhood}
                  onChange={(e) => updateBilling("neighborhood", e.target.value)}
                  placeholder="Centro"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="sm:col-span-2 grid grid-cols-[1fr_120px] gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Endereço</label>
                  <input
                    type="text"
                    required
                    value={billing.addressLine1}
                    onChange={(e) => updateBilling("addressLine1", e.target.value)}
                    placeholder="Rua Exemplo"
                    className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Número</label>
                  <input
                    type="text"
                    required
                    value={billing.addressNumber}
                    onChange={(e) => updateBilling("addressNumber", e.target.value)}
                    placeholder="123"
                    className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card data */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Dados do cartão</h3>
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome no cartão</label>
                <input
                  type="text"
                  required
                  value={card.holderName}
                  onChange={(e) => updateCard("holderName", e.target.value.toUpperCase())}
                  placeholder="NOME COMO ESTÁ NO CARTÃO"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 uppercase"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Número do cartão</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={card.number}
                    onChange={(e) => updateCard("number", formatCardNumber(e.target.value))}
                    placeholder="0000 0000 0000 0000"
                    className="w-full rounded-lg border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-mono tracking-wider"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Validade</label>
                <input
                  type="text"
                  required
                  value={card.expiry}
                  onChange={(e) => updateCard("expiry", formatExpiry(e.target.value))}
                  placeholder="MM/AA"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">CVV</label>
                <input
                  type="text"
                  required
                  value={card.cvv}
                  onChange={(e) => updateCard("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="000"
                  className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Error message */}
          {result === "error" && errorMsg && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <XCircle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-500">{errorMsg}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-[0_0_16px_hsl(172_66%_50%/0.3)] hover:shadow-[0_0_24px_hsl(172_66%_50%/0.45)] transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando pagamento...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Assinar {plan.name} — {plan.price}/mês
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-muted-foreground">
            Pagamento processado com segurança. Ao confirmar, você concorda com os termos de uso.
          </p>
        </form>
      </div>
    </div>
  );
}
