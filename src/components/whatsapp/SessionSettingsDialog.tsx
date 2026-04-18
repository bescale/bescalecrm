import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
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
import {
  useUpdateSessionWebhook,
  useUpdateSessionPrompt,
} from "@/hooks/useWhatsAppSessions";

interface SessionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionName: string;
  initialWebhookUrl: string;
  initialPrompt: string;
}

export default function SessionSettingsDialog({
  open,
  onOpenChange,
  sessionId,
  sessionName,
  initialWebhookUrl,
  initialPrompt,
}: SessionSettingsDialogProps) {
  const updateWebhook = useUpdateSessionWebhook();
  const updatePrompt = useUpdateSessionPrompt();

  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl);
  const [prompt, setPrompt] = useState(initialPrompt);

  // Sync when dialog opens with new values
  useEffect(() => {
    if (open) {
      setWebhookUrl(initialWebhookUrl);
      setPrompt(initialPrompt);
    }
  }, [open, initialWebhookUrl, initialPrompt]);

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
            Configure o webhook adicional e o prompt fixo desta instancia.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
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
              rows={8}
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
