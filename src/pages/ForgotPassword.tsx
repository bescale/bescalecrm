import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img
            src="/logo-bescale.png"
            alt="Bescale"
            className="mx-auto h-14 w-auto object-contain"
          />
          <h1 className="mt-4 text-2xl font-bold">Recuperar senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviaremos um link para redefinir sua senha
          </p>
        </div>

        {sent ? (
          <div className="rounded-xl border bg-card p-6 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-crm-success/10 flex items-center justify-center">
              <Mail className="h-6 w-6 text-crm-success" />
            </div>
            <h3 className="font-semibold">E-mail enviado!</h3>
            <p className="text-sm text-muted-foreground">
              Verifique sua caixa de entrada em <strong>{email}</strong> e clique no link para redefinir sua senha.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                "Enviar link"
              )}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            <ArrowLeft className="h-3 w-3" /> Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
