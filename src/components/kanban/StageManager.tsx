import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import type { PipelineStage } from "@/hooks/usePipelineStages";
import {
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
} from "@/hooks/usePipelineStages";

const COLORS = [
  "#2BB8A3", "#0E9AA7", "#5B7FBF", "#8B7FD4", "#C084D4",
  "#E87F9F", "#E8956A", "#D4A853", "#6DBF8B", "#4ECDC4",
];

interface StageManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  opportunityCounts: Map<string, number>;
}

export default function StageManager({
  open,
  onOpenChange,
  stages,
  opportunityCounts,
}: StageManagerProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);

  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();
  const reorderStages = useReorderStages();

  function handleAdd() {
    if (!newName.trim()) return;
    createStage.mutate({ name: newName.trim(), color: newColor });
    setNewName("");
  }

  function handleMove(index: number, direction: -1 | 1) {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= stages.length) return;

    const newOrder = stages.map((s, i) => {
      if (i === index) return { id: s.id, position: stages[swapIndex].position };
      if (i === swapIndex) return { id: s.id, position: stages[index].position };
      return { id: s.id, position: s.position };
    });

    reorderStages.mutate(newOrder);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Etapas</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[400px] overflow-auto">
          {stages.map((stage, idx) => {
            const count = opportunityCounts.get(stage.id) || 0;
            return (
              <div key={stage.id} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                <input
                  type="color"
                  value={stage.color || "#2BB8A3"}
                  onChange={(e) => updateStage.mutate({ id: stage.id, color: e.target.value })}
                  className="w-6 h-6 rounded border-0 cursor-pointer"
                />
                <Input
                  defaultValue={stage.name}
                  className="h-8 text-sm"
                  onBlur={(e) => {
                    if (e.target.value !== stage.name) {
                      updateStage.mutate({ id: stage.id, name: e.target.value });
                    }
                  }}
                />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMove(idx, -1)}
                    disabled={idx === 0}
                    className="p-1 hover:bg-secondary rounded disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 1)}
                    disabled={idx === stages.length - 1}
                    className="p-1 hover:bg-secondary rounded disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteStage.mutate(stage.id)}
                    disabled={count > 0}
                    className="p-1 hover:bg-destructive/10 rounded text-destructive disabled:opacity-30"
                    title={count > 0 ? `${count} oportunidade(s) nesta etapa` : "Excluir"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-2 border-t">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-6 h-6 rounded border-0 cursor-pointer"
          />
          <Input
            placeholder="Nome da etapa"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
