import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PipelineStage = Tables<"pipeline_stages">;

export function usePipelineStages() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["pipeline_stages", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("position");
      if (error) throw error;
      return data as PipelineStage[];
    },
    enabled: !!companyId,
  });
}

export function useCreateStage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: { name: string; color: string }) => {
      const companyId = profile?.company_id;
      if (!companyId) throw new Error("Sem company_id");

      // Get max position
      const { data: stages } = await supabase
        .from("pipeline_stages")
        .select("position")
        .order("position", { ascending: false })
        .limit(1);

      const position = (stages?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from("pipeline_stages")
        .insert({ name: params.name, color: params.color, company_id: companyId, position })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      toast.success("Etapa criada");
    },
    onError: () => toast.error("Erro ao criar etapa"),
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; name?: string; color?: string }) => {
      const update: TablesUpdate<"pipeline_stages"> = {};
      if (params.name !== undefined) update.name = params.name;
      if (params.color !== undefined) update.color = params.color;

      const { data, error } = await supabase
        .from("pipeline_stages")
        .update(update)
        .eq("id", params.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
    },
    onError: () => toast.error("Erro ao atualizar etapa"),
  });
}

export function useDeleteStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stageId: string) => {
      // Check if stage has opportunities
      const { count } = await supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("stage_id", stageId);

      if (count && count > 0) {
        throw new Error("Esta etapa possui oportunidades. Mova-as antes de excluir.");
      }

      const { error } = await supabase
        .from("pipeline_stages")
        .delete()
        .eq("id", stageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      toast.success("Etapa excluída");
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao excluir etapa"),
  });
}

export function useReorderStages() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (stages: { id: string; position: number }[]) => {
      const updates = stages.map((s) =>
        supabase.from("pipeline_stages").update({ position: s.position }).eq("id", s.id)
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
    },
    onMutate: async (newOrder) => {
      const key = ["pipeline_stages", profile?.company_id];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<PipelineStage[]>(key);

      if (prev) {
        const updated = prev.map((s) => {
          const match = newOrder.find((o) => o.id === s.id);
          return match ? { ...s, position: match.position } : s;
        });
        updated.sort((a, b) => a.position - b.position);
        queryClient.setQueryData(key, updated);
      }

      return { prev, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(context.key, context.prev);
      toast.error("Erro ao reordenar etapas");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
    },
  });
}
