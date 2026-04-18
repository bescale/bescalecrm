import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal, Plus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import KanbanCard from "./KanbanCard";
import type { PipelineStage } from "@/hooks/usePipelineStages";
import type { OpportunityRow } from "@/hooks/useOpportunities";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

interface KanbanColumnProps {
  stage: PipelineStage;
  cards: OpportunityRow[];
  onAddCard: (stageId: string) => void;
  onCardClick: (opp: OpportunityRow) => void;
  onWhatsApp: (opp: OpportunityRow) => void;
  onEditStage: (stage: PipelineStage) => void;
  onDeleteStage: (stageId: string) => void;
}

export default function KanbanColumn({
  stage,
  cards,
  onAddCard,
  onCardClick,
  onWhatsApp,
  onEditStage,
  onDeleteStage,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage.id, data: { type: "column", stage } });
  const total = cards.reduce((s, c) => s + c.value, 0);
  const cardIds = cards.map((c) => c.id);

  return (
    <div className="w-[300px] flex flex-col bg-secondary/50 rounded-xl shrink-0">
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stage.color || "#2BB8A3" }}
          />
          <h3 className="font-semibold text-sm">{stage.name}</h3>
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
            {cards.length}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEditStage(stage)}>Editar etapa</DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteStage(stage.id)}
              className="text-destructive"
            >
              Excluir etapa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {total > 0 && (
        <p className="px-4 pb-2 text-xs text-muted-foreground">
          Total: {formatCurrency(total)}
        </p>
      )}

      <div ref={setNodeRef} className="flex-1 overflow-auto p-2 space-y-2 scrollbar-thin min-h-[60px]">
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <KanbanCard
              key={card.id}
              opportunity={card}
              onClick={() => onCardClick(card)}
              onWhatsApp={card.contacts?.phone ? () => onWhatsApp(card) : undefined}
            />
          ))}
        </SortableContext>

        {cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">Nenhuma oportunidade</p>
          </div>
        )}
      </div>

      <button
        onClick={() => onAddCard(stage.id)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground p-3 pt-1 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar
      </button>
    </div>
  );
}
