import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Companies ──────────────────────────────────────────────

export function useAdminCompanies() {
  return useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminCompany(companyId: string | undefined) {
  return useQuery({
    queryKey: ["admin-company", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; cnpj?: string; plan?: string }) => {
      const { data, error } = await supabase
        .from("companies")
        .insert({
          name: payload.name,
          cnpj: payload.cnpj || null,
          plan: payload.plan || "free",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      toast.success("Empresa criada com sucesso!");
    },
    onError: (err) => toast.error("Erro ao criar empresa: " + (err as Error).message),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      cnpj?: string | null;
      plan?: string;
      is_active?: boolean;
      address?: string | null;
      business_area?: string | null;
      description?: string | null;
      products_services?: string | null;
    }) => {
      const { error } = await supabase.from("companies").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      qc.invalidateQueries({ queryKey: ["admin-company"] });
      toast.success("Empresa atualizada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

// ── Company Members ────────────────────────────────────────

export function useCompanyMembers(companyId: string | undefined) {
  return useQuery({
    queryKey: ["admin-company-members", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      // Use SECURITY DEFINER RPC to bypass RLS (super_admin only)
      const { data: profiles, error } = await supabase
        .rpc("get_company_profiles", { _company_id: companyId! });
      if (error) throw error;
      if (!profiles || profiles.length === 0) return [];

      const memberIds = profiles.map((p: any) => p.id);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", memberIds);

      const roleMap = new Map<string, string>();
      roles?.forEach((r) => roleMap.set(r.user_id, r.role));

      return profiles.map((p: any) => ({
        ...p,
        role: roleMap.get(p.id) || null,
      }));
    },
  });
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: role as any })
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: role as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-members"] });
      toast.success("Cargo atualizado!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ company_id: null })
        .eq("id", userId);
      if (error) throw error;
      await supabase.from("user_roles").delete().eq("user_id", userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-members"] });
      toast.success("Membro removido!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

// ── Company WhatsApp Sessions ──────────────────────────────

export function useCompanySessions(companyId: string | undefined) {
  return useQuery({
    queryKey: ["admin-company-sessions", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSessionAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, name }: { companyId: string; name: string }) => {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .insert({ company_id: companyId, name, status: "disconnected" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-sessions"] });
      toast.success("Instância criada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      settings?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from("whatsapp_sessions").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-sessions"] });
      toast.success("Instância atualizada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-company-sessions"] });
      toast.success("Instância deletada!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

// ── Subscription Links ─────────────────────────────────────

export function useSubscriptionLinks() {
  return useQuery({
    queryKey: ["admin-subscription-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_links")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateSubscriptionLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      company_id: string;
      plan: string;
      plan_name: string;
      plan_price: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("subscription_links")
        .insert({
          company_id: payload.company_id,
          plan: payload.plan,
          plan_name: payload.plan_name,
          plan_price: payload.plan_price,
          created_by: userData.user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-links"] });
      toast.success("Link de assinatura gerado!");
    },
    onError: (err) => toast.error("Erro ao gerar link: " + (err as Error).message),
  });
}

export function useExpireSubscriptionLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscription_links")
        .update({ status: "expired" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-links"] });
      toast.success("Link expirado!");
    },
    onError: (err) => toast.error("Erro: " + (err as Error).message),
  });
}

// ── Public: fetch link by token & sign ─────────────────────

export function useSubscriptionByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["subscription-link", token],
    enabled: !!token,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_links")
        .select("*, companies(name, logo_url)")
        .eq("token", token!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSignSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linkId, companyId, plan }: { linkId: string; companyId: string; plan: string }) => {
      // 1. Accept the subscription link
      const { error: linkError } = await supabase
        .from("subscription_links")
        .update({ status: "accepted", signed_at: new Date().toISOString() })
        .eq("id", linkId);
      if (linkError) throw linkError;

      // 2. Update the company's plan
      const { error: companyError } = await supabase
        .from("companies")
        .update({ plan })
        .eq("id", companyId);
      if (companyError) throw companyError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription-link"] });
      qc.invalidateQueries({ queryKey: ["admin-companies"] });
      toast.success("Assinatura confirmada!");
    },
    onError: (err) => toast.error("Erro ao assinar: " + (err as Error).message),
  });
}
