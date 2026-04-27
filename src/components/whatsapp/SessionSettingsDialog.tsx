import { useState, useEffect } from "react";
import { Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  useUpdateSessionWebhook,
  useUpdateSessionPrompt,
  useUpdateSessionFollowup,
  type FollowupKey,
} from "@/hooks/useWhatsAppSessions";

export const FOLLOWUP_OPTIONS: { key: FollowupKey; label: string; description: string }[] = [
  { key: "followup_2h", label: "2 horas", description: "Enviar follow-up apos 2 horas sem resposta" },
  { key: "followup_1d", label: "1 dia", description: "Enviar follow-up apos 1 dia sem resposta" },
  { key: "followup_2d", label: "2 dias", description: "Enviar follow-up apos 2 dias sem resposta" },
  { key: "followup_3d", label: "3 dias", description: "Enviar follow-up apos 3 dias sem resposta" },
];

interface SessionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionName: string;
  initialWebhookUrl: string;
  initialPrompt: string;
  initialFollowups?: Partial<Record<FollowupKey, boolean>>;
}

const DEFAULT_FOLLOWUPS: Record<FollowupKey, boolean> = {
  followup_2h: false,
  followup_1d: false,
  followup_2d: false,
  followup_3d: false,
};

export default function SessionSettingsDialog({
  open,
  onOpenChange,
  sessionId,
  sessionName,
  initialWebhookUrl,
  initialPrompt,
  initialFollowups,
}: SessionSettingsDialogProps) {
  const followupsState: Record<FollowupKey, boolean> = {
    ...DEFAULT_FOLLOWUPS,
    ...(initialFollowups ?? {}),
  };

  const updateWebhook = useUpdateSessionWebhook();
  const updatePrompt = useUpdateSessionPrompt();
  const updateFollowup = useUpdateSessionFollowup();

  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [prompt, setPrompt] = useState(initialPrompt);

  // Sync when dialog opens with new values
  useEffect(() => {
    if (open) {
      setWebhookUrl(initialWebhookUrl);
      setPrompt(initialPrompt);
    }
  }, [open, initialWebhookUrl, initialPrompt]);

  const handleFollowupToggle = (key: FollowupKey, value: boolean) => {
    updateFollowup.mutate(
      { sessionId, key, value },
      {
        onError: (err) => toast.error("Erro: " + (err as Error).message),
      }
    );
  };

  const isSaving = updateWebhook.isPending || updatePrompt.isPending;

  const handleSave = async () => {
    const trimmedWebhook = webhookUrl.trim();
    const trimmedPrompt = prompt.trim();

    const webhookChanged = trimmedWebhook !== initialWebhookUrl;
    const promptChanged = trimmedPrompt !== initialPrompt;

    if (!webhookChanged && !promptChanged) {
      onOpenChange(false);
      return;
    }

    try {
      const promises: Promise<unknown>[] = [];

      if (webhookChanged) {
        promises.push(
          updateWebhook.mutateAsync({ sessionId, webhookUrl: trimmedWebhook })
        );
      }
      if (promptChanged) {
        promises.push(
          updatePrompt.mutateAsync({ sessionId, prompt: trimmedPrompt })
        );
      }

      await Promise.all(promises);
      toast.success("Configuracoes salvas");
      onOpenChange(false);
    } catch (err) {
      toast.error("Erro: " + (err as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuracoes — {sessionName}</DialogTitle>
          <DialogDescription>
            Configure o webhook adicional, o prompt fixo e os follow-ups desta instancia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Follow-ups (primeiro para garantir visibilidade) */}
          <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <label className="text-sm font-semibold">Follow-up automatico</label>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ative os intervalos de follow-up desejados para esta instancia. As alteracoes sao salvas automaticamente.
            </p>
            <div className="rounded-lg border bg-background divide-y">
              {FOLLOWUP_OPTIONS.map(({ key, label, description }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {description}
                    </p>
                  </div>
                  <Switch
                    checked={!!followupsState[key]}
                    disabled={updateFollowup.isPending}
                    onCheckedChange={(v) => handleFollowupToggle(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook URL adicional</label>
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://seu-servidor.com/webhook"
              className="w-full rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              URL que recebera notificacoes adicionais de eventos desta instancia.
            </p>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt fixo da instancia</label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Voce e um assistente de vendas da empresa X. Sempre responda de forma educada e objetiva..."
              rows={6}
              className="resize-y font-mono text-xs leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">
              Instrucoes fixas que serao usadas pela IA ao responder nesta instancia.
            </p>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
