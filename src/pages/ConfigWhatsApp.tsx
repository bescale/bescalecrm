import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Play,
  Square,
  Trash2,
  QrCode,
  Loader2,
  Wifi,
  WifiOff,
  Smartphone,
  Link,
  Settings,
  MessageSquareText,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  useWhatsAppSessions,
  useCreateSession,
  useSessionAction,
  useSessionQr,
  useRealtimeWhatsAppSessions,
  useSyncSessionStatuses,
} from "@/hooks/useWhatsAppSessions";
import SessionSettingsDialog from "@/components/whatsapp/SessionSettingsDialog";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { AlertTriangle } from "lucide-react";

export default function ConfigWhatsApp() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useWhatsAppSessions();
  useRealtimeWhatsAppSessions();

  const createSession = useCreateSession();
  const sessionAction = useSessionAction();
  const syncStatuses = useSyncSessionStatuses();
  const { plan, canAddSession, formatLimit } = usePlanLimits();

  // Sync real status from WAHA on mount
  useEffect(() => {
    syncStatuses.mutate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);

  const handleTryCreate = async () => {
    const check = await canAddSession();
    if (!check.allowed) {
      setLimitReached(true);
      toast.error(
        `Limite do plano atingido: ${check.current}/${formatLimit(check.limit)} sessões WhatsApp. Faça upgrade para adicionar mais.`
      );
      return;
    }
    setLimitReached(false);
    setShowCreate(true);
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    createSession.mutate(newName.trim(), {
      onSuccess: (data: any) => {
        toast.success("Sessao criada! Escaneie o QR Code.");
        setShowCreate(false);
        setNewName("");
        setQrSessionId(data.id);
      },
      onError: (err) => toast.error("Erro: " + (err as Error).message),
    });
  };

  const handleAction = (sessionId: string, action: "start" | "stop" | "delete") => {
    if (action === "delete" && !confirm("Deseja realmente deletar esta sessao?")) return;
    sessionAction.mutate(
      { sessionId, action },
      {
        onSuccess: () => {
          toast.success(
            action === "start"
              ? "Sessao iniciada"
              : action === "stop"
              ? "Sessao parada"
              : "Sessao deletada"
          );
          if (action === "delete" && qrSessionId === sessionId) setQrSessionId(null);
        },
        onError: (err) => toast.error("Erro: " + (err as Error).message),
      }
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/configuracoes")}
          className="rounded-lg p-2 hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground text-sm">
            Gerenciar sessoes e conexoes do WhatsApp
          </p>
        </div>
      </div>

      {/* Plan limit info */}
      {plan && (
        <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-4 py-2.5 text-xs text-muted-foreground">
          <Smartphone className="h-3.5 w-3.5" />
          <span>
            Sessões WhatsApp: {sessions?.length || 0} / {formatLimit(plan.max_whatsapp_sessions)}
            <span className="ml-1 text-muted-foreground/60">({plan.name})</span>
          </span>
        </div>
      )}

      {/* Create session */}
      {!showCreate ? (
        <button
          onClick={handleTryCreate}
          className="flex items-center gap-2 rounded-xl border border-dashed bg-card p-4 w-full text-left hover:border-primary/30 transition-all text-sm text-muted-foreground"
        >
          <Plus className="h-5 w-5" />
          Nova sessao WhatsApp
        </button>
      ) : (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <label className="text-sm font-medium">Nome da sessao</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: Vendas, Suporte..."
            className="w-full rounded-lg border bg-secondary/50 py-2 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={createSession.isPending}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createSession.isPending ? "Criando..." : "Criar"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewName("");
              }}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* QR Code */}
      {qrSessionId && <QrCodeDisplay sessionId={qrSessionId} onClose={() => setQrSessionId(null)} />}

      {/* Sessions list */}
      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="space-y-3">
        {sessions?.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            onQr={() => setQrSessionId(s.id)}
            onAction={(action) => handleAction(s.id, action)}
          />
        ))}
      </div>
    </div>
  );
}

function SessionCard({
  session: s,
  onQr,
  onAction,
}: {
  session: ReturnType<typeof useWhatsAppSessions>["data"] extends (infer T)[] | undefined ? T : never;
  onQr: () => void;
  onAction: (action: "start" | "stop" | "delete") => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const savedWebhookUrl = s.webhook_url || "";
  const savedPrompt = s.prompt || "";

  return (
    <>
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{s.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={s.status} />
              {s.phone_number && (
                <span className="text-xs text-muted-foreground">
                  {s.phone_number}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-lg p-2 hover:bg-secondary transition-colors text-muted-foreground"
              title="Configuracoes"
            >
              <Settings className="h-4 w-4" />
            </button>
            {s.status === "starting" && (
              <button
                onClick={onQr}
                className="rounded-lg p-2 hover:bg-secondary transition-colors text-muted-foreground"
                title="Ver QR Code"
              >
                <QrCode className="h-4 w-4" />
              </button>
            )}
            {s.status === "disconnected" && (
              <button
                onClick={() => onAction("start")}
                className="rounded-lg p-2 hover:bg-secondary transition-colors text-green-600"
                title="Iniciar"
              >
                <Play className="h-4 w-4" />
              </button>
            )}
            {s.status === "connected" && (
              <button
                onClick={() => onAction("stop")}
                className="rounded-lg p-2 hover:bg-secondary transition-colors text-yellow-600"
                title="Parar"
              >
                <Square className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onAction("delete")}
              className="rounded-lg p-2 hover:bg-secondary transition-colors text-destructive"
              title="Deletar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Webhook + Prompt summary */}
        <div className="border-t pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Webhook</span>
            </div>
            <p className="text-xs font-mono text-muted-foreground/70 truncate">
              {savedWebhookUrl || "Nao configurado"}
            </p>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquareText className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">Prompt</span>
            </div>
            <p className="text-xs text-muted-foreground/70 truncate">
              {savedPrompt || "Nao configurado"}
            </p>
          </div>
        </div>
      </div>

      <SessionSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        sessionId={s.id}
        sessionName={s.name}
        initialWebhookUrl={savedWebhookUrl}
        initialPrompt={savedPrompt}
      />
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "connected") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-600">
        <Wifi className="h-3 w-3" /> Conectado
      </span>
    );
  }
  if (status === "starting") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-600">
        <Loader2 className="h-3 w-3 animate-spin" /> Aguardando QR
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-600">
      <WifiOff className="h-3 w-3" /> Desconectado
    </span>
  );
}

function QrCodeDisplay({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) {
  const { data: qr, isLoading, error } = useSessionQr(sessionId);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3 text-center">
      <h3 className="font-semibold text-sm">Escaneie o QR Code no WhatsApp</h3>
      <p className="text-xs text-muted-foreground">
        Abra o WhatsApp no celular, va em Dispositivos conectados e escaneie o codigo
      </p>
      <div className="flex justify-center py-4">
        {isLoading && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
        {error && (
          <p className="text-sm text-destructive">Erro ao carregar QR Code</p>
        )}
        {qr?.value && (
          <img
            src={`data:image/png;base64,${qr.value}`}
            alt="QR Code WhatsApp"
            className="w-64 h-64"
          />
        )}
      </div>
      <button
        onClick={onClose}
        className="rounded-lg border px-4 py-2 text-sm hover:bg-secondary"
      >
        Fechar
      </button>
    </div>
  );
}
