import { useEffect, useState } from "react";
import {
  Building2,
  UserCircle2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Mail,
  Infinity as InfinityIcon,
  Sparkles,
  Headphones,
  Target,
  Smartphone,
  Users as UsersIcon,
  Bot,
  Contact,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAdminPlans, useCreateCompanyWithAdmin } from "@/hooks/useAdminData";

type Plan = NonNullable<ReturnType<typeof useAdminPlans>["data"]>[number];

interface CreateCompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type StepKey = "empresa" | "admin" | "plano";

const STEPS: { key: StepKey; label: string; icon: typeof Building2 }[] = [
  { key: "empresa", label: "Empresa", icon: Building2 },
  { key: "admin", label: "Admin", icon: UserCircle2 },
  { key: "plano", label: "Plano", icon: CreditCard },
];

// Features boolean do plano (atributos que podem ser inclusos ou não)
const BOOLEAN_FEATURES: {
  key: "ai_enabled" | "priority_support" | "remarketing";
  label: string;
  description: string;
  icon: typeof Sparkles;
}[] = [
  {
    key: "ai_enabled",
    label: "IA habilitada",
    description: "Agentes de IA para responder mensagens automaticamente",
    icon: Sparkles,
  },
  {
    key: "priority_support",
    label: "Suporte prioritário",
    description: "Atendimento preferencial e SLA reduzido",
    icon: Headphones,
  },
  {
    key: "remarketing",
    label: "Remarketing",
    description: "Campanhas automáticas para reengajar contatos inativos",
    icon: Target,
  },
];

// Features numéricas (limites)
const NUMERIC_FEATURES: {
  key: "max_whatsapp_sessions" | "max_users" | "max_agents" | "max_contacts";
  label: string;
  icon: typeof Smartphone;
}[] = [
  { key: "max_whatsapp_sessions", label: "Instâncias WhatsApp", icon: Smartphone },
  { key: "max_users", label: "Usuários", icon: UsersIcon },
  { key: "max_agents", label: "Agentes IA", icon: Bot },
  { key: "max_contacts", label: "Contatos", icon: Contact },
];

interface FormState {
  company_name: string;
  cnpj: string;
  business_area: string;
  postal_code: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  admin_name: string;
  admin_email: string;
  plan_slug: string;
  // Overrides das features
  ai_enabled: boolean;
  priority_support: boolean;
  remarketing: boolean;
  max_whatsapp_sessions: number;
  max_users: number;
  max_agents: number;
  max_contacts: number;
}

const INITIAL_STATE: FormState = {
  company_name: "",
  cnpj: "",
  business_area: "",
  postal_code: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  admin_name: "",
  admin_email: "",
  plan_slug: "",
  ai_enabled: false,
  priority_support: false,
  remarketing: false,
  max_whatsapp_sessions: 1,
  max_users: 1,
  max_agents: 0,
  max_contacts: 100,
};

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function formatCEP(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export default function CreateCompanyDialog({
  open,
  onOpenChange,
}: CreateCompanyDialogProps) {
  const { data: plans } = useAdminPlans();
  const createCompanyWithAdmin = useCreateCompanyWithAdmin();

  const [step, setStep] = useState<StepKey>("empresa");
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  // Quando muda o plano selecionado, pre-popular os overrides com os valores do plano
  useEffect(() => {
    if (!form.plan_slug) return;
    const plan = plans?.find((p) => p.slug === form.plan_slug);
    if (!plan) return;
    setForm((prev) => ({
      ...prev,
      ai_enabled: plan.ai_enabled,
      priority_support: plan.priority_support,
      // Remarketing não existe na tabela plans — mantém o valor atual
      // (default false no INITIAL_STATE, ou o que o admin já tiver marcado)
      remarketing: prev.remarketing,
      max_whatsapp_sessions: plan.max_whatsapp_sessions,
      max_users: plan.max_users,
      max_agents: plan.max_agents,
      max_contacts: plan.max_contacts,
    }));
  }, [form.plan_slug, plans]);

  function reset() {
    setStep("empresa");
    setForm(INITIAL_STATE);
  }

  function closeDialog() {
    reset();
    onOpenChange(false);
  }

  // Validações por step
  const canAdvanceFromEmpresa = !!form.company_name.trim();
  const canAdvanceFromAdmin =
    !!form.admin_name.trim() && !!form.admin_email.trim() && form.admin_email.includes("@");
  const canSubmit = canAdvanceFromEmpresa && canAdvanceFromAdmin && !!form.plan_slug;

  function advance() {
    if (step === "empresa" && canAdvanceFromEmpresa) setStep("admin");
    else if (step === "admin" && canAdvanceFromAdmin) setStep("plano");
  }
  function goBack() {
    if (step === "admin") setStep("empresa");
    else if (step === "plano") setStep("admin");
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const selectedPlan = plans?.find((p) => p.slug === form.plan_slug);
    createCompanyWithAdmin.mutate(
      {
        company_name: form.company_name.trim(),
        cnpj: form.cnpj.trim() || undefined,
        plan_slug: form.plan_slug,
        plan_id: selectedPlan?.id,
        admin_email: form.admin_email.trim(),
        admin_name: form.admin_name.trim(),
        // Plano customizado vinculado à empresa — criado a partir do template selecionado
        custom_plan: {
          ai_enabled: form.ai_enabled,
          priority_support: form.priority_support,
          max_whatsapp_sessions: form.max_whatsapp_sessions,
          max_users: form.max_users,
          max_agents: form.max_agents,
          max_contacts: form.max_contacts,
          extra_features: {
            remarketing: form.remarketing,
          },
        },
        extras: {
          business_area: form.business_area.trim() || null,
          address: {
            postal_code: form.postal_code.replace(/\D/g, "") || null,
            street: form.street.trim() || null,
            number: form.number.trim() || null,
            neighborhood: form.neighborhood.trim() || null,
            city: form.city.trim() || null,
            state: form.state || null,
          },
          plan_template_name: selectedPlan?.name ?? null,
          plan_template_slug: selectedPlan?.slug ?? null,
          plan_template_price: selectedPlan?.price ?? null,
          plan_template_price_label: selectedPlan?.price_label ?? null,
        },
      },
      { onSuccess: closeDialog },
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova empresa</DialogTitle>
          <DialogDescription>
            Cadastre a empresa, defina o admin e configure o plano em 3 etapas.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 py-2">
          {STEPS.map((s, idx) => {
            const active = s.key === step;
            const done = idx < stepIndex;
            return (
              <div key={s.key} className="flex items-center flex-1">
                <div
                  className={`flex items-center gap-2 ${
                    active
                      ? "text-primary"
                      : done
                        ? "text-primary/70"
                        : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
                      active
                        ? "border-primary bg-primary/10"
                        : done
                          ? "border-primary/70 bg-primary/5"
                          : "border-border"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span className="text-xs font-medium hidden sm:inline">
                    {s.label}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-3 ${
                      done ? "bg-primary/40" : "bg-border"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Step content */}
        <div className="py-2 min-h-[320px]">
          {step === "empresa" && <EmpresaStep form={form} setForm={setForm} />}
          {step === "admin" && <AdminStep form={form} setForm={setForm} />}
          {step === "plano" && (
            <PlanoStep
              form={form}
              setForm={setForm}
              plans={plans ?? []}
            />
          )}
        </div>

        <DialogFooter className="flex !justify-between w-full gap-2">
          <div>
            {step !== "empresa" && (
              <button
                type="button"
                onClick={goBack}
                disabled={createCompanyWithAdmin.isPending}
                className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeDialog}
              disabled={createCompanyWithAdmin.isPending}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-secondary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            {step !== "plano" ? (
              <button
                type="button"
                onClick={advance}
                disabled={
                  (step === "empresa" && !canAdvanceFromEmpresa) ||
                  (step === "admin" && !canAdvanceFromAdmin)
                }
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Avançar
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || createCompanyWithAdmin.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {createCompanyWithAdmin.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Criar e enviar convite
                  </>
                )}
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Steps ─────────────────────────────────────────────── */

function EmpresaStep({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [cepLoading, setCepLoading] = useState(false);
  const upd = (k: keyof FormState, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  async function handleCepBlur() {
    const digits = form.postal_code.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.erro) return;
      setForm((prev) => ({
        ...prev,
        street: prev.street || data.logradouro || "",
        neighborhood: prev.neighborhood || data.bairro || "",
        city: prev.city || data.localidade || "",
        state: prev.state || data.uf || "",
      }));
    } catch {
      // offline ou ViaCEP indisponível — ignora
    } finally {
      setCepLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Identificação */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Nome *</label>
          <input
            value={form.company_name}
            onChange={(e) => upd("company_name", e.target.value)}
            placeholder="Nome da empresa"
            className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">CNPJ</label>
          <input
            value={form.cnpj}
            onChange={(e) => upd("cnpj", formatCNPJ(e.target.value))}
            placeholder="00.000.000/0000-00"
            className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Área de atuação */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Área de atuação
        </label>
        <input
          value={form.business_area}
          onChange={(e) => upd("business_area", e.target.value)}
          placeholder="Ex: Tecnologia, Saúde..."
          className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Endereço */}
      <div className="space-y-3 border-t pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Endereço
        </h4>

        <div className="grid grid-cols-[140px_1fr] gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">CEP</label>
            <div className="relative">
              <input
                value={form.postal_code}
                onChange={(e) => upd("postal_code", formatCEP(e.target.value))}
                onBlur={handleCepBlur}
                placeholder="00000-000"
                className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
              {cepLoading && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Estado</label>
            <select
              value={form.state}
              onChange={(e) => upd("state", e.target.value)}
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Selecione</option>
              {BR_STATES.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Cidade</label>
            <input
              value={form.city}
              onChange={(e) => upd("city", e.target.value)}
              placeholder="São Paulo"
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Bairro</label>
            <input
              value={form.neighborhood}
              onChange={(e) => upd("neighborhood", e.target.value)}
              placeholder="Centro"
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Rua</label>
            <input
              value={form.street}
              onChange={(e) => upd("street", e.target.value)}
              placeholder="Rua Exemplo"
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Número</label>
            <input
              value={form.number}
              onChange={(e) => upd("number", e.target.value)}
              placeholder="123"
              className="w-full rounded-lg border bg-secondary/50 py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStep({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const upd = (k: keyof FormState, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
        O admin receberá um email de convite para ativar a conta e definir a senha.
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Nome completo *
        </label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={form.admin_name}
            onChange={(e) => upd("admin_name", e.target.value)}
            placeholder="Nome do admin da empresa"
            className="w-full rounded-lg border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          Email *
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="email"
            value={form.admin_email}
            onChange={(e) => upd("admin_email", e.target.value)}
            placeholder="admin@empresa.com"
            className="w-full rounded-lg border bg-secondary/50 py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
    </div>
  );
}

function PlanoStep({
  form,
  setForm,
  plans,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  plans: Plan[];
}) {
  const selectedPlan = plans.find((p) => p.slug === form.plan_slug);

  function setBool(
    key: "ai_enabled" | "priority_support" | "remarketing",
    value: boolean,
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function setNum(
    key: "max_whatsapp_sessions" | "max_users" | "max_agents" | "max_contacts",
    value: number,
  ) {
    setForm((prev) => ({ ...prev, [key]: Math.max(0, value) }));
  }

  return (
    <div className="space-y-5">
      {/* Seleção do plano */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground">
          Escolha o plano *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {plans.map((p) => (
            <button
              type="button"
              key={p.slug}
              onClick={() => setForm((prev) => ({ ...prev, plan_slug: p.slug }))}
              className={`flex flex-col items-start rounded-lg border px-3 py-2.5 text-left transition-all ${
                form.plan_slug === p.slug
                  ? "border-primary bg-primary/5 text-primary"
                  : "hover:bg-secondary text-muted-foreground"
              }`}
            >
              <span className="text-xs font-semibold">{p.name}</span>
              {p.price_label && (
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {p.price_label}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Features do plano selecionado */}
      {selectedPlan && (
        <>
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide">
                Recursos inclusos
              </label>
              <span className="text-[10px] text-muted-foreground">
                Padrão do plano {selectedPlan.name} — ajuste se necessário
              </span>
            </div>
            <div className="rounded-lg border bg-background divide-y">
              {BOOLEAN_FEATURES.map(({ key, label, description, icon: Icon }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Icon
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        form[key] ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form[key]}
                    onCheckedChange={(v) => setBool(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Limites numéricos */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Limites
            </label>
            <div className="grid grid-cols-2 gap-3">
              {NUMERIC_FEATURES.map(({ key, label, icon: Icon }) => (
                <div key={key} className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      value={form[key]}
                      onChange={(e) => setNum(key, parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border bg-secondary/50 py-2 pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {form[key] >= 999999 && (
                      <InfinityIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Use <span className="font-mono">999999</span> para ilimitado.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
