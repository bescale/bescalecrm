import { Trash2, CheckCircle, Mic } from "lucide-react";

interface AudioRecorderProps {
  recording: boolean;
  elapsed: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AudioRecorder({
  recording,
  elapsed,
  onStart,
  onStop,
  onCancel,
}: AudioRecorderProps) {
  if (!recording) {
    return (
      <button
        onClick={onStart}
        className="rounded-lg p-2 hover:bg-secondary transition-colors text-muted-foreground"
        title="Gravar áudio"
      >
        <Mic className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-1 bg-destructive/10 rounded-lg px-3 py-1.5">
      <button
        onClick={onCancel}
        className="rounded-full p-1.5 hover:bg-destructive/20 text-destructive transition-colors"
        title="Cancelar gravação"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-2 flex-1">
        <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-sm font-mono text-destructive">
          {formatTime(elapsed)}
        </span>
      </div>

      <button
        onClick={onStop}
        className="rounded-full p-1.5 hover:bg-primary/20 text-primary transition-colors"
        title="Parar e enviar"
      >
        <CheckCircle className="h-5 w-5" />
      </button>
    </div>
  );
}
