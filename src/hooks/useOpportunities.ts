import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PipelineStage } from "./usePipelineStages";

export interface OpportunityTag {
  tag_id: string;
  tags: { id: string; name: string; color: string | null } | null;
}

export interface OpportunityRow {
  id: string;
  title: string;
  value: number;
  probability: number;
  position: number;
  stage_id: string;
  contact_id: string | null;
  responsible_id: string | null;
  expected_close_date: string | null;
  notes: string | null;
  company_id: string;
  created_at: string;
  updated_at: string;
  contacts: { id: string; name: string; phone: string | null; custom_fields: Record<string, unknown> | null } | null;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  opportunity_tags: OpportunityTag[];
}

export function useOpportunities() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["opportunities", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select(`
          *,
          contacts(id, name, phone, custom_fields),
          profiles!opportunities_responsible_id_fkey(id, full_name, avatar_url),
          opportunity_tags(tag_id, tags(id, name, color))
        `)
        .order("position");
      if (error) throw error;
      return data as unknown as OpportunityRow[];
    },
    enabled: !!companyId,
  });
}

export interface CreateOpportunityParams {
  title: string;
  value: number;
  probability: number;
  stage_id: string;
  contact_id?: string | null;
  responsible_id?: string | null;
  expected_close_date?: string | null;
  notes?: string | null;
  tag_ids?: string[];
}

export function useCreateOpportunity() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: CreateOpportunityParams) => {
      const companyId = profile?.company_id;
      if (!companyId) throw new Error("Sem company_id");

      // Get max position in stage
      const { data: existing } = await supabase
        .from("opportunities")
        .select("position")
        .eq("stage_id", params.stage_id)
        .order("position", { ascending: false })
        .limit(1);

      const position = (existing?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from("opportunities")
        .insert({
          title: params.title,
          value: params.value,
          probability: params.probability,
          stage_id: params.stage_id,
          contact_id: params.contact_id || null,
          responsible_id: params.responsible_id || null,
          expected_close_date: params.expected_close_date || null,
          notes: params.notes || null,
          company_id: companyId,
          position,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert tags
      if (params.tag_ids?.length) {
        await supabase.from("opportunity_tags").insert(
          params.tag_ids.map((tag_id) => ({ opportunity_id: data.id, tag_id }))
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade criada");
    },
    onError: () => toast.error("Erro ao criar oportunidade"),
  });
}

export function useUpdateOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateOpportunityParams & { id: string }) => {
      const { id, tag_ids, ...rest } = params;
      const { data, error } = await supabase
        .from("opportunities")
        .update({
          title: rest.title,
          value: rest.value,
          probability: rest.probability,
          stage_id: rest.stage_id,
          contact_id: rest.contact_id || null,
          responsible_id: rest.responsible_id || null,
          expected_close_date: rest.expected_close_date || null,
          notes: rest.notes || null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      // Sync tags: delete all, re-insert
      await supabase.from("opportunity_tags").delete().eq("opportunity_id", id);
      if (tag_ids?.length) {
        await supabase.from("opportunity_tags").insert(
          tag_ids.map((tag_id) => ({ opportunity_id: id, tag_id }))
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade atualizada");
    },
    onError: () => toast.error("Erro ao atualizar oportunidade"),
  });
}

export function useDeleteOpportunity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("opportunity_tags").delete().eq("opportunity_id", id);
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade excluída");
    },
    onError: () => toast.error("Erro ao excluir oportunidade"),
  });
}

export function useMoveOpportunity() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (params: { id: string; stage_id: string; position: number }) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ stage_id: params.stage_id, position: params.position })
        .eq("id", params.id);
      if (error) throw error;
    },
    onMutate: async (params) => {
      const key = ["opportunities", profile?.company_id];
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<OpportunityRow[]>(key);

      if (prev) {
        const updated = prev.map((o) =>
          o.id === params.id ? { ...o, stage_id: params.stage_id, position: params.position } : o
        );
        queryClient.setQueryData(key, updated);
      }

      return { prev, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(context.key, context.prev);
      toast.error("Erro ao mover oportunidade");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function groupByStage(stages: PipelineStage[], opportunities: OpportunityRow[]) {
  const map = new Map<string, OpportunityRow[]>();
  for (const stage of stages) {
    map.set(stage.id, []);
  }
  for (const opp of opportunities) {
    const list = map.get(opp.stage_id);
    if (list) list.push(opp);
  }
  // Sort each group by position
  for (const [, list] of map) {
    list.sort((a, b) => a.position - b.position);
  }
  return map;
}
