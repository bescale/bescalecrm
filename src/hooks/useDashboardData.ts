import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// ── helpers ──────────────────────────────────────────────
function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
}

function toISO(d: Date) {
  return d.toISOString();
}

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ── KPIs ─────────────────────────────────────────────────
export function useDashboardKPIs() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["dashboard-kpis", companyId],
    queryFn: async () => {
      const today = startOfDay(new Date());
      const todayISO = toISO(today);
      const yesterdayISO = toISO(daysAgo(1));
      const sevenDaysAgoISO = toISO(daysAgo(7));
      const fourteenDaysAgoISO = toISO(daysAgo(14));

      // 1) Conversations today vs yesterday
      const [convToday, convYesterday] = await Promise.all([
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId!)
          .gte("created_at", todayISO),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId!)
          .gte("created_at", yesterdayISO)
          .lt("created_at", todayISO),
      ]);

      // 2) Qualified leads (score >= 50) — current vs previous 7 days
      const [leadsNow, leadsPrev] = await Promise.all([
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId!)
          .gte("score", 50)
          .gte("created_at", sevenDaysAgoISO),
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId!)
          .gte("score", 50)
          .gte("created_at", fourteenDaysAgoISO)
          .lt("created_at", sevenDaysAgoISO),
      ]);

      // 3) Open opportunities (all that are not in the last stage)
      const { data: opportunities } = await supabase
        .from("opportunities")
        .select("id, value, created_at")
        .eq("company_id", companyId!);

      const totalOpportunities = opportunities?.length ?? 0;
      const pipelineValue = opportunities?.reduce((sum, o) => sum + (o.value || 0), 0) ?? 0;

      // Previous period opportunities for comparison
      const oppsNow = opportunities?.filter(
        (o) => new Date(o.created_at) >= daysAgo(7)
      ).length ?? 0;
      const oppsPrev = opportunities?.filter(
        (o) => new Date(o.created_at) >= daysAgo(14) && new Date(o.created_at) < daysAgo(7)
      ).length ?? 0;

      // Pipeline value comparison
      const valueNow = opportunities
        ?.filter((o) => new Date(o.created_at) >= daysAgo(7))
        .reduce((s, o) => s + (o.value || 0), 0) ?? 0;
      const valuePrev = opportunities
        ?.filter(
          (o) => new Date(o.created_at) >= daysAgo(14) && new Date(o.created_at) < daysAgo(7)
        )
        .reduce((s, o) => s + (o.value || 0), 0) ?? 0;

      return {
        conversationsToday: convToday.count ?? 0,
        conversationsYesterday: convYesterday.count ?? 0,
        leadsQualified: leadsNow.count ?? 0,
        leadsQualifiedPrev: leadsPrev.count ?? 0,
        totalOpportunities,
        opportunitiesChange: { now: oppsNow, prev: oppsPrev },
        pipelineValue,
        pipelineValueChange: { now: valueNow, prev: valuePrev },
      };
    },
    enabled: !!companyId,
    refetchInterval: 60_000,
  });
}

// ── Conversations by day (last 7 days) ──────────────────
export function useConversationsByDay() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["dashboard-conversations-by-day", companyId],
    queryFn: async () => {
      const since = toISO(daysAgo(7));

      const { data, error } = await supabase
        .from("conversations")
        .select("id, status, created_at")
        .eq("company_id", companyId!)
        .gte("created_at", since);

      if (error) throw error;

      // Build per-day buckets for the last 7 days
      const buckets: Record<string, { total: number; ia: number; humano: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = daysAgo(i);
        const key = d.toISOString().slice(0, 10);
        buckets[key] = { total: 0, ia: 0, humano: 0 };
      }

      for (const conv of data ?? []) {
        const key = conv.created_at.slice(0, 10);
        if (!buckets[key]) continue;
        buckets[key].total++;
        if (conv.status === "ai") {
          buckets[key].ia++;
        } else {
          buckets[key].humano++;
        }
      }

      return Object.entries(buckets).map(([dateStr, counts]) => {
        const dayIndex = new Date(dateStr + "T12:00:00").getDay();
        return {
          name: DAY_LABELS[dayIndex],
          date: dateStr,
          ...counts,
        };
      });
    },
    enabled: !!companyId,
    refetchInterval: 60_000,
  });
}

// ── Funnel: opportunities per pipeline stage ─────────────
export function useFunnelData() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["dashboard-funnel", companyId],
    queryFn: async () => {
      const [{ data: stages, error: stagesErr }, { data: opportunities, error: oppsErr }] =
        await Promise.all([
          supabase.from("pipeline_stages").select("id, name, color, position").eq("company_id", companyId!).order("position"),
          supabase.from("opportunities").select("id, stage_id").eq("company_id", companyId!),
        ]);

      if (stagesErr) throw stagesErr;
      if (oppsErr) throw oppsErr;

      const countMap = new Map<string, number>();
      for (const opp of opportunities ?? []) {
        countMap.set(opp.stage_id, (countMap.get(opp.stage_id) ?? 0) + 1);
      }

      return (stages ?? []).map((stage) => ({
        name: stage.name,
        value: countMap.get(stage.id) ?? 0,
        color: stage.color ?? undefined,
      }));
    },
    enabled: !!companyId,
    refetchInterval: 60_000,
  });
}

// ── Attendant performance ────────────────────────────────
export interface AttendantPerformance {
  id: string;
  name: string;
  avatarUrl: string | null;
  conversations: number;
  resolved: number;
  avgResponseTime: string;
}

export function useAttendantPerformance() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["dashboard-attendants", companyId],
    queryFn: async () => {
      // Fetch profiles for this company (active agents)
      const { data: profiles, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("company_id", companyId!)
        .eq("is_active", true);

      if (profErr) throw profErr;

      // Fetch all assigned conversations
      const { data: conversations, error: convErr } = await supabase
        .from("conversations")
        .select("id, assigned_to, status, created_at, closed_at")
        .eq("company_id", companyId!);

      if (convErr) throw convErr;

      const result: AttendantPerformance[] = [];

      for (const p of profiles ?? []) {
        const assigned = (conversations ?? []).filter((c) => c.assigned_to === p.id);
        if (assigned.length === 0) continue;

        const closed = assigned.filter((c) => c.status === "closed");

        // Average time to close (created_at → closed_at)
        let avgMs = 0;
        const withClose = closed.filter((c) => c.closed_at);
        if (withClose.length > 0) {
          const totalMs = withClose.reduce((sum, c) => {
            return sum + (new Date(c.closed_at!).getTime() - new Date(c.created_at).getTime());
          }, 0);
          avgMs = totalMs / withClose.length;
        }

        const minutes = Math.floor(avgMs / 60000);
        const seconds = Math.floor((avgMs % 60000) / 1000);
        const avgTime =
          withClose.length > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : "—";

        result.push({
          id: p.id,
          name: p.full_name,
          avatarUrl: p.avatar_url,
          conversations: assigned.length,
          resolved: closed.length,
          avgResponseTime: avgTime,
        });
      }

      // Sort by most conversations
      result.sort((a, b) => b.conversations - a.conversations);
      return result;
    },
    enabled: !!companyId,
    refetchInterval: 60_000,
  });
}
