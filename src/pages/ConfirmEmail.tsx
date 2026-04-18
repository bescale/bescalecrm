import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

type Status = "verifying" | "success" | "error" | "waiting";

export default function ConfirmEmail() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [status, setStatus] = useState<Status>("waiting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Supabase appends #access_token=...&type=signup to the redirect URL
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) {
      // No token in URL — show "check your email" state
      setStatus("waiting");
      return;
    }

    setStatus("verifying");

    // Supabase JS client automatically picks up the token from the hash
    // and exchanges it for a session via onAuthStateChange.
    // We just need to wait for the session to be set.
    const timeout = setTimeout(() => {
      setStatus("error");
      setErrorMsg("Tempo esgotado. Tente clicar no link do e-mail novamente.");
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN") {
          clearTimeout(timeout);
          setStatus("success");
          // Redirect to plan selection after a brief success message
          setTimeout(() => navigate("/planos", { replace: true }), 1500);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  // If user is already logged in and lands here, redirect to plans
  useEffect(() => {
    if (session && status === "waiting") {
      navigate("/planos", { replace: true });
    }
  }, [session, status, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-secondary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[300px] w-[300px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md text-center space-y-6">
        <img
          src="/logo-bescale.png"
          alt="Bescale"
          className="mx-auto h-14 w-auto object-contain drop-shadow-[0_0_24px_hsl(172_66%_50%/0.25)]"
        />

        {status === "waiting" && (
          <div className="space-y-4 rounded-xl border bg-card p-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold">Verifique seu e-mail</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enviamos um link de confirmação para o seu e-mail.
              <br />
              Clique no link para ativar sua conta e escolher seu plano.
            </p>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                Não recebeu?{" "}
                <button
                  onClick={() => navigate("/signup")}
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Tentar novamente
                </button>
              </p>
            </div>
          </div>
        )}

        {status === "verifying" && (
          <div className="space-y-4 rounded-xl border bg-card p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Confirmando sua conta...</h1>
            <p className="text-sm text-muted-foreground">
              Aguarde enquanto validamos seu e-mail.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4 rounded-xl border bg-card p-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold">Conta confirmada!</h1>
            <p className="text-sm text-muted-foreground">
              Redirecionando para a escolha do plano...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4 rounded-xl border bg-card p-8">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold">Erro na confirmação</h1>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <button
              onClick={() => navigate("/signup")}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Voltar ao cadastro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
