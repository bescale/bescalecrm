import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";
import type { PipelineStage } from "@/hooks/usePipelineStages";
import type { OpportunityRow } from "@/hooks/useOpportunities";
import { groupByStage, useMoveOpportunity } from "@/hooks/useOpportunities";

interface KanbanBoardProps {
  stages: PipelineStage[];
  opportunities: OpportunityRow[];
  onAddCard: (stageId: string) => void;
  onCardClick: (opp: OpportunityRow) => void;
  onWhatsApp: (opp: OpportunityRow) => void;
  onEditStage: (stage: PipelineStage) => void;
  onDeleteStage: (stageId: string) => void;
}

export default function KanbanBoard({
  stages,
  opportunities,
  onAddCard,
  onCardClick,
  onWhatsApp,
  onEditStage,
  onDeleteStage,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const moveOpp = useMoveOpportunity();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const grouped = useMemo(() => groupByStage(stages, opportunities), [stages, opportunities]);

  const activeOpp = activeId ? opportunities.find((o) => o.id === activeId) : null;

  function findColumnOfCard(cardId: string): string | null {
    for (const [stageId, cards] of grouped) {
      if (cards.some((c) => c.id === cardId)) return stageId;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeCardId = active.id as string;
    const overData = over.data.current;

    // Determine target stage and position
    let targetStageId: string;
    let targetPosition: number;

    if (overData?.type === "column") {
      // Dropped directly on column
      targetStageId = over.id as string;
      const cardsInStage = grouped.get(targetStageId) || [];
      targetPosition = cardsInStage.length > 0
        ? cardsInStage[cardsInStage.length - 1].position + 1
        : 0;
    } else {
      // Dropped on another card
      const overCardId = over.id as string;
      const overOpp = opportunities.find((o) => o.id === overCardId);
      if (!overOpp) return;
      targetStageId = overOpp.stage_id;

      const cardsInStage = grouped.get(targetStageId) || [];
      const overIndex = cardsInStage.findIndex((c) => c.id === overCardId);

      if (overIndex === 0) {
        targetPosition = overOpp.position / 2;
      } else if (overIndex === cardsInStage.length - 1) {
        targetPosition = overOpp.position + 1;
      } else {
        // Check if active card is currently above or below
        const activeOppCurrent = opportunities.find((o) => o.id === activeCardId);
        if (activeOppCurrent?.stage_id === targetStageId) {
          const activeIndex = cardsInStage.findIndex((c) => c.id === activeCardId);
          if (activeIndex < overIndex) {
            // Moving down: place after over
            const next = cardsInStage[overIndex + 1];
            targetPosition = next
              ? (overOpp.position + next.position) / 2
              : overOpp.position + 1;
          } else {
            // Moving up: place before over
            const prev = cardsInStage[overIndex - 1];
            targetPosition = prev
              ? (prev.position + overOpp.position) / 2
              : overOpp.position / 2;
          }
        } else {
          // Coming from another column: place before over
          const prev = cardsInStage[overIndex - 1];
          targetPosition = prev
            ? (prev.position + overOpp.position) / 2
            : overOpp.position / 2;
        }
      }
    }

    // Only move if something changed
    const activeOppCurrent = opportunities.find((o) => o.id === activeCardId);
    if (
      activeOppCurrent &&
      (activeOppCurrent.stage_id !== targetStageId || activeOppCurrent.position !== targetPosition)
    ) {
      moveOpp.mutate({ id: activeCardId, stage_id: targetStageId, position: targetPosition });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full min-w-max">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            cards={grouped.get(stage.id) || []}
            onAddCard={onAddCard}
            onCardClick={onCardClick}
            onWhatsApp={onWhatsApp}
            onEditStage={onEditStage}
            onDeleteStage={onDeleteStage}
          />
        ))}
      </div>
      <DragOverlay>
        {activeOpp && (
          <div className="rotate-2 opacity-90">
            <KanbanCard opportunity={activeOpp} onClick={() => {}} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
