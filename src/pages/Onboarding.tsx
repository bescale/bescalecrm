import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Building, Users, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

type Mode = null | "create" | "join";

export default function Onboarding() {
  const { session, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>(null);
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.company_id) return <Navigate to="/" replace />;

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const cnpjDigits = cnpj.replace(/\D/g, "");
    if (cnpjDigits.length !== 14) {
      toast({ title: "CNPJ inválido", description: "Informe um CNPJ válido com 14 dígitos.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("create_company_and_assign", {
      _name: companyName,
      _cnpj: cnpj || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      await refreshProfile();
      navigate("/checkout", { state: { selectedPlan: "essential" } });
    }
    setSubmitting(false);
  };

  const handleJoinCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.rpc("join_company_by_invite_code", {
      _invite_code: inviteCode,
    });
    if (error) {
      toast({
        title: "Erro",
        description: error.message.includes("inválido")
          ? "Código de convite inválido ou empresa inativa."
          : error.message,
        variant: "destructive",
      });
    } else {
      await refreshProfile();
      navigate("/");
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <img
            src="/logo-bescale.png"
            alt="Bescale"
            className="mx-auto h-14 w-auto object-contain"
          />
          <h1 className="mt-4 text-2xl font-bold">Bem-vindo ao Bescale!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Como você gostaria de começar?
          </p>
        </div>

        {!mode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setMode("create")}
              className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 hover:border-primary/50 hover:shadow-md transition-all text-center group"
            >
              <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Building className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Criar empresa</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Configurar uma nova empresa no sistema
                </p>
              </div>
            </button>

            <button
              onClick={() => setMode("join")}
              className="flex flex-col items-center gap-4 rounded-xl border bg-card p-8 hover:border-primary/50 hover:shadow-md transition-all text-center group"
            >
              <div className="h-14 w-14 rounded-xl bg-crm-info/10 flex items-center justify-center group-hover:bg-crm-info/20 transition-colors">
                <Users className="h-7 w-7 text-crm-info" />
              </div>
              <div>
                <h3 className="font-semibold">Entrar com convite</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Usar um código de convite para entrar em uma empresa
                </p>
              </div>
            </button>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreateCompany} className="space-y-4 rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-lg">Dados da empresa</h3>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome da empresa *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Minha Empresa Ltda"
                className="w-full rounded-lg border bg-background py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">CNPJ *</label>
              <input
                type="text"
                required
                value={cnpj}
                onChange={(e) => setCnpj(formatCNPJ(e.target.value))}
                placeholder="00.000.000/0001-00"
                className="w-full rounded-lg border bg-background py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="rounded-lg border px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    Criar empresa <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoinCompany} className="space-y-4 rounded-xl border bg-card p-6">
            <h3 className="font-semibold text-lg">Código de convite</h3>
            <p className="text-sm text-muted-foreground">
              Peça o código de convite ao administrador da empresa.
            </p>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Código</label>
              <input
                type="text"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="ex: a1b2c3d4"
                className="w-full rounded-lg border bg-background py-2.5 px-4 text-sm font-mono tracking-wider outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode(null)}
                className="rounded-lg border px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                ) : (
                  <>
                    Entrar na empresa <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
