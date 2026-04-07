import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Settings2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { usePipelineStages } from "@/hooks/usePipelineStages";
import {
  useOpportunities,
  useCreateOpportunity,
  useUpdateOpportunity,
  useDeleteOpportunity,
  groupByStage,
  type OpportunityRow,
  type CreateOpportunityParams,
} from "@/hooks/useOpportunities";
import { useRealtimeKanban } from "@/hooks/useRealtimeKanban";
import type { PipelineStage } from "@/hooks/usePipelineStages";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import OpportunityDialog from "@/components/kanban/OpportunityDialog";
import OpportunityDetail from "@/components/kanban/OpportunityDetail";
import StageManager from "@/components/kanban/StageManager";
import { useDeleteStage } from "@/hooks/usePipelineStages";
import { toast } from "sonner";

export default function Kanban() {
  const navigate = useNavigate();
  const { data: stages, isLoading: loadingStages } = usePipelineStages();
  const { data: opportunities, isLoading: loadingOpps } = useOpportunities();
  useRealtimeKanban();

  const createOpp = useCreateOpportunity();
  const updateOpp = useUpdateOpportunity();
  const deleteOpp = useDeleteOpportunity();
  const deleteStage = useDeleteStage();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState<OpportunityRow | null>(null);
  const [defaultStageId, setDefaultStageId] = useState<string>("");

  // Detail sheet state
  const [detailOpp, setDetailOpp] = useState<OpportunityRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Stage manager state
  const [stageManagerOpen, setStageManagerOpen] = useState(false);

  // Editing stage inline (from column dropdown)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);

  const opportunityCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (stages && opportunities) {
      const grouped = groupByStage(stages, opportunities);
      for (const [stageId, cards] of grouped) {
        map.set(stageId, cards.length);
      }
    }
    return map;
  }, [stages, opportunities]);

  const handleAddCard = useCallback((stageId: string) => {
    setEditingOpp(null);
    setDefaultStageId(stageId);
    setDialogOpen(true);
  }, []);

  const handleCardClick = useCallback((opp: OpportunityRow) => {
    setDetailOpp(opp);
    setDetailOpen(true);
  }, []);

  const handleWhatsApp = useCallback(async (opp: OpportunityRow) => {
    if (!opp.contacts?.phone) return;
    // Find conversation for this contact
    const { data } = await supabase
      .from("conversations")
      .select("id")
      .eq("contact_id", opp.contact_id!)
      .order("last_message_at", { ascending: false })
      .limit(1);

    if (data?.[0]) {
      navigate(`/chat?conversation=${data[0].id}`);
    } else {
      toast.info("Nenhuma conversa encontrada para este contato");
    }
  }, [navigate]);

  const handleEditStage = useCallback((stage: PipelineStage) => {
    setStageManagerOpen(true);
  }, []);

  const handleDeleteStage = useCallback((stageId: string) => {
    deleteStage.mutate(stageId);
  }, [deleteStage]);

  const handleSave = useCallback((data: CreateOpportunityParams & { id?: string }) => {
    if (data.id) {
      updateOpp.mutate(data as CreateOpportunityParams & { id: string });
    } else {
      createOpp.mutate(data);
    }
  }, [createOpp, updateOpp]);

  const handleEditFromDetail = useCallback((opp: OpportunityRow) => {
    setDetailOpen(false);
    setEditingOpp(opp);
    setDefaultStageId(opp.stage_id);
    setDialogOpen(true);
  }, []);

  const isLoading = loadingStages || loadingOpps;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between p-6 pb-4">
        <div>
          <h1 className="text-2xl font-bold">Oportunidades</h1>
          <p className="text-muted-foreground text-sm">Funil de vendas — Kanban</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStageManagerOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" />
            Etapas
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingOpp(null);
              setDefaultStageId(stages?.[0]?.id || "");
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Nova Oportunidade
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stages && stages.length > 0 ? (
          <KanbanBoard
            stages={stages}
            opportunities={opportunities || []}
            onAddCard={handleAddCard}
            onCardClick={handleCardClick}
            onWhatsApp={handleWhatsApp}
            onEditStage={handleEditStage}
            onDeleteStage={handleDeleteStage}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg font-medium mb-2">Nenhuma etapa configurada</p>
            <p className="text-sm mb-4">Configure as etapas do seu funil de vendas</p>
            <Button onClick={() => setStageManagerOpen(true)}>
              <Settings2 className="h-4 w-4 mr-1" />
              Configurar Etapas
            </Button>
          </div>
        )}
      </div>

      {stages && (
        <>
          <OpportunityDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            stages={stages}
            opportunity={editingOpp}
            defaultStageId={defaultStageId}
            onSave={handleSave}
          />

          <OpportunityDetail
            opportunity={detailOpp}
            open={detailOpen}
            onOpenChange={setDetailOpen}
            onEdit={handleEditFromDetail}
            onDelete={(id) => deleteOpp.mutate(id)}
            onWhatsApp={handleWhatsApp}
          />

          <StageManager
            open={stageManagerOpen}
            onOpenChange={setStageManagerOpen}
            stages={stages}
            opportunityCounts={opportunityCounts}
          />
        </>
      )}
    </div>
  );
}
