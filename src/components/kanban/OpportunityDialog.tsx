import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PipelineStage } from "@/hooks/usePipelineStages";
import type { OpportunityRow, CreateOpportunityParams } from "@/hooks/useOpportunities";

const schema = z.object({
  title: z.string().min(1, "Titulo obrigatorio"),
  value: z.coerce.number().min(0),
  probability: z.coerce.number().min(0).max(100),
  stage_id: z.string().min(1),
  contact_id: z.string().optional(),
  responsible_id: z.string().optional(),
  expected_close_date: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  opportunity?: OpportunityRow | null;
  defaultStageId?: string;
  onSave: (data: CreateOpportunityParams & { id?: string }) => void;
}

export default function OpportunityDialog({
  open,
  onOpenChange,
  stages,
  opportunity,
  defaultStageId,
  onSave,
}: OpportunityDialogProps) {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      value: 0,
      probability: 50,
      stage_id: defaultStageId || stages[0]?.id || "",
      contact_id: "",
      responsible_id: "",
      expected_close_date: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (opportunity) {
        form.reset({
          title: opportunity.title,
          value: opportunity.value,
          probability: opportunity.probability,
          stage_id: opportunity.stage_id,
          contact_id: opportunity.contact_id || "",
          responsible_id: opportunity.responsible_id || "",
          expected_close_date: opportunity.expected_close_date || "",
          notes: opportunity.notes || "",
        });
      } else {
        form.reset({
          title: "",
          value: 0,
          probability: 50,
          stage_id: defaultStageId || stages[0]?.id || "",
          contact_id: "",
          responsible_id: "",
          expected_close_date: "",
          notes: "",
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, opportunity, defaultStageId, stages]);

  const { data: contacts } = useQuery({
    queryKey: ["contacts-select", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("contacts").select("id, name").eq("company_id", companyId!).order("name");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-select", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("company_id", companyId!).eq("is_active", true).order("full_name");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  function onSubmit(data: FormData) {
    onSave({
      ...data,
      contact_id: data.contact_id || null,
      responsible_id: data.responsible_id || null,
      expected_close_date: data.expected_close_date || null,
      notes: data.notes || null,
      ...(opportunity ? { id: opportunity.id } : {}),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{opportunity ? "Editar Oportunidade" : "Nova Oportunidade"}</DialogTitle>
          <DialogDescription>Preencha os dados da oportunidade</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Titulo</Label>
            <Input id="title" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">Valor (R$)</Label>
              <Input id="value" type="number" step="0.01" {...form.register("value")} />
            </div>
            <div>
              <Label htmlFor="probability">Probabilidade (%)</Label>
              <Input id="probability" type="number" min={0} max={100} {...form.register("probability")} />
            </div>
          </div>

          <div>
            <Label>Etapa</Label>
            <Select value={form.watch("stage_id")} onValueChange={(v) => form.setValue("stage_id", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Contato</Label>
            <Select
              value={form.watch("contact_id") || "__none__"}
              onValueChange={(v) => form.setValue("contact_id", v === "__none__" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar contato" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {contacts?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Responsavel</Label>
            <Select
              value={form.watch("responsible_id") || "__none__"}
              onValueChange={(v) => form.setValue("responsible_id", v === "__none__" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecionar responsavel" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {profiles?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expected_close_date">Data prevista de fechamento</Label>
            <Input id="expected_close_date" type="date" {...form.register("expected_close_date")} />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {opportunity ? "Salvar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
