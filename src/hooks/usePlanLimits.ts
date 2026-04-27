import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanLimits {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_label: string;
  max_whatsapp_sessions: number;
  max_users: number;
  max_agents: number;
  max_contacts: number;
  ai_enabled: boolean;
  priority_support: boolean;
  custom_branding: boolean;
  api_access: boolean;
}

function isUnlimited(limit: number) {
  return limit === -1;
}

export function useCompanyPlan() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["company-plan", companyId],
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000, // 5 min cache
    queryFn: async (): Promise<PlanLimits | null> => {
      const { data, error } = await supabase
        .from("companies")
        .select("plan_id, plans(*)")
        .eq("id", companyId!)
        .single();

      if (error) throw error;
      // plans vem como objeto via join
      const plan = (data as any)?.plans;
      return plan || null;
    },
  });
}

export function usePlanLimits() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const { data: plan, isLoading } = useCompanyPlan();

  async function countWhatsAppSessions(): Promise<number> {
    if (!companyId) return 0;
    const { count } = await supabase
      .from("whatsapp_sessions")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);
    return count || 0;
  }

  async function countUsers(): Promise<number> {
    if (!companyId) return 0;
    // Só contabiliza membros ativos da empresa do caller.
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true);
    return count || 0;
  }

  async function countAgents(): Promise<number> {
    if (!companyId) return 0;
    const { count } = await supabase
      .from("ai_agents")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);
    return count || 0;
  }

  async function countContacts(): Promise<number> {
    if (!companyId) return 0;
    const { count } = await supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);
    return count || 0;
  }

  async function canAddSession(): Promise<{ allowed: boolean; current: number; limit: number }> {
    if (!plan) return { allowed: false, current: 0, limit: 0 };
    if (isUnlimited(plan.max_whatsapp_sessions)) return { allowed: true, current: 0, limit: -1 };
    const current = await countWhatsAppSessions();
    return { allowed: current < plan.max_whatsapp_sessions, current, limit: plan.max_whatsapp_sessions };
  }

  async function canAddUser(): Promise<{ allowed: boolean; current: number; limit: number }> {
    if (!plan) return { allowed: false, current: 0, limit: 0 };
    if (isUnlimited(plan.max_users)) return { allowed: true, current: 0, limit: -1 };
    const current = await countUsers();
    return { allowed: current < plan.max_users, current, limit: plan.max_users };
  }

  async function canAddAgent(): Promise<{ allowed: boolean; current: number; limit: number }> {
    if (!plan) return { allowed: false, current: 0, limit: 0 };
    if (isUnlimited(plan.max_agents)) return { allowed: true, current: 0, limit: -1 };
    const current = await countAgents();
    return { allowed: current < plan.max_agents, current, limit: plan.max_agents };
  }

  async function canAddContact(): Promise<{ allowed: boolean; current: number; limit: number }> {
    if (!plan) return { allowed: false, current: 0, limit: 0 };
    if (isUnlimited(plan.max_contacts)) return { allowed: true, current: 0, limit: -1 };
    const current = await countContacts();
    return { allowed: current < plan.max_contacts, current, limit: plan.max_contacts };
  }

  function formatLimit(limit: number): string {
    if (limit === -1) return "Ilimitado";
    return limit.toLocaleString("pt-BR");
  }

  return {
    plan,
    isLoading,
    canAddSession,
    canAddUser,
    canAddAgent,
    canAddContact,
    formatLimit,
    isUnlimited,
  };
}
