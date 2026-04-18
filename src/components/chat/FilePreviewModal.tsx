// src/components/chat/FilePreviewModal.tsx
import { useState, useEffect } from "react";
import { X, Send, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FilePreviewModalProps {
  file: File | null;
  onSend: (file: File, caption: string) => void;
  onCancel: () => void;
  sending: boolean;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilePreviewModal({
  file,
  onSend,
  onCancel,
  sending,
}: FilePreviewModalProps) {
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setCaption("");
      setPreviewUrl(null);
      return;
    }
    if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (!file) return null;

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  return (
    <Dialog open={!!file} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar arquivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isImage && previewUrl && (
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-h-64 object-contain rounded-lg bg-secondary"
            />
          )}
          {isVideo && previewUrl && (
            <video
              src={previewUrl}
              controls
              className="w-full max-h-64 rounded-lg bg-secondary"
            />
          )}
          {!isImage && !isVideo && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium truncate max-w-[300px]">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)}
                </p>
              </div>
            </div>
          )}

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Adicionar legenda..."
            className="w-full rounded-lg border bg-secondary/50 py-2 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sending) onSend(file, caption);
            }}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={sending}>
              Cancelar
            </Button>
            <Button onClick={() => onSend(file, caption)} disabled={sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
