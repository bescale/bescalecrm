import { useMemo, useState } from "react";
import {
  MessageSquare,
  TrendingUp,
  DollarSign,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Zap,
  RefreshCw,
  UserCheck,
  Flame,
  AlertTriangle,
  Star,
  Phone,
  Building2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  useDashboardKPIs,
  useConversationsByDay,
  useFunnelData,
  useMemoriaMetrics,
  useLeadsByScore,
  type ScoredLead,
} from "@/hooks/useDashboardData";
import { useUserRole } from "@/hooks/useUserRole";

// ── helpers ──────────────────────────────────────────────
function pctChange(now: number, prev: number): { label: string; up: boolean } {
  if (prev === 0 && now === 0) return { label: "0%", up: true };
  if (prev === 0) return { label: "+100%", up: true };
  const pct = Math.round(((now - prev) / prev) * 100);
  return {
    label: `${pct >= 0 ? "+" : ""}${pct}%`,
    up: pct >= 0,
  };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`;
  return `R$ ${value}`;
}

const FALLBACK_FUNNEL_COLORS = [
  "hsl(172,66%,50%)",
  "hsl(190,76%,38%)",
  "hsl(190,76%,52%)",
  "hsl(190,60%,65%)",
  "hsl(215,12%,40%)",
  "hsl(260,55%,62%)",
  "hsl(38,85%,55%)",
  "hsl(160,84%,39%)",
];

const TOOLTIP_STYLE = {
  borderRadius: "8px",
  background: "hsl(220,14%,9%)",
  border: "1px solid hsl(220,12%,16%)",
  fontSize: "12px",
  color: "hsl(210,20%,94%)",
};

// ── Skeleton Loaders ─────────────────────────────────────
function KPISkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-8 w-8 bg-muted rounded-lg" />
          </div>
          <div className="flex items-end gap-2">
            <div className="h-7 w-16 bg-muted rounded" />
            <div className="h-4 w-10 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

// ── Main component ───────────────────────────────────────
export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: chartData, isLoading: chartLoading } = useConversationsByDay();
  const { data: funnelData, isLoading: funnelLoading } = useFunnelData();
  const { data: memoriaMetrics, isLoading: memoriaLoading } = useMemoriaMetrics();
  const { data: leadsData, isLoading: leadsLoading } = useLeadsByScore();
  const { data: role } = useUserRole();
  const isSuperAdmin = role === "super_admin";
  const [companyFilter, setCompanyFilter] = useState<string>("all");

  const companyOptions = useMemo(() => {
    const set = new Set<string>();
    (leadsData?.all ?? []).forEach((l) => {
      if (l.company_name && l.company_name.trim()) set.add(l.company_name.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [leadsData]);

  const filteredLeads = useMemo(() => {
    if (!leadsData) return null;
    if (!isSuperAdmin || companyFilter === "all") return leadsData;
    const match = (l: ScoredLead) =>
      companyFilter === "__none__"
        ? !l.company_name || !l.company_name.trim()
        : l.company_name?.trim() === companyFilter;
    return {
      hot: leadsData.hot.filter(match),
      warm: leadsData.warm.filter(match),
      cold: leadsData.cold.filter(match),
      all: leadsData.all.filter(match),
    };
  }, [leadsData, companyFilter]);

  // Build KPI cards from real data
  const kpiCards = kpis
    ? [
        (() => {
          const c = pctChange(kpis.conversationsToday, kpis.conversationsYesterday);
          return {
            label: "Conversas Hoje",
            value: String(kpis.conversationsToday),
            label_change: c.label,
            up: c.up,
            icon: MessageSquare,
            color: "bg-crm-status-ai/10 text-crm-status-ai",
          };
        })(),
        (() => {
          const c = pctChange(kpis.leadsQualified, kpis.leadsQualifiedPrev);
          return {
            label: "Leads Qualificados",
            value: String(kpis.leadsQualified),
            label_change: c.label,
            up: c.up,
            icon: Bot,
            color: "bg-primary/10 text-primary",
          };
        })(),
        (() => {
          const c = pctChange(kpis.opportunitiesChange.now, kpis.opportunitiesChange.prev);
          return {
            label: "Oportunidades Abertas",
            value: String(kpis.totalOpportunities),
            label_change: c.label,
            up: c.up,
            icon: TrendingUp,
            color: "bg-crm-success/10 text-crm-success",
          };
        })(),
        (() => {
          const c = pctChange(kpis.pipelineValueChange.now, kpis.pipelineValueChange.prev);
          return {
            label: "Valor em Pipeline",
            value: formatCurrency(kpis.pipelineValue),
            label_change: c.label,
            up: c.up,
            icon: DollarSign,
            color: "bg-crm-warning/10 text-crm-warning",
          };
        })(),
      ]
    : [];

  // Funnel colors — prefer stage color from DB, fallback to palette
  const funnelColors = (funnelData ?? []).map(
    (item, i) => item.color || FALLBACK_FUNNEL_COLORS[i % FALLBACK_FUNNEL_COLORS.length]
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Visão geral do desempenho — Últimos 7 dias
        </p>
      </div>

      {/* KPIs */}
      {kpisLoading ? (
        <KPISkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{kpi.label}</span>
                <div className={`rounded-lg p-2 ${kpi.color}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">{kpi.value}</span>
                <span
                  className={`flex items-center text-xs font-medium ${
                    kpi.up ? "text-crm-success" : "text-destructive"
                  }`}
                >
                  {kpi.up ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {kpi.label_change}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversations Chart */}
        <div className="lg:col-span-2 rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-4">Conversas por Dia</h3>
          {chartLoading ? (
            <ChartSkeleton />
          ) : (chartData ?? []).length === 0 ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              Nenhuma conversa nos últimos 7 dias
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,14%)" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(215,12%,40%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(215,12%,40%)" />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="ia"
                  stackId="1"
                  stroke="hsl(190,76%,52%)"
                  fill="hsl(190,76%,52%)"
                  fillOpacity={0.25}
                  name="IA"
                />
                <Area
                  type="monotone"
                  dataKey="humano"
                  stackId="1"
                  stroke="hsl(172,66%,50%)"
                  fill="hsl(172,66%,50%)"
                  fillOpacity={0.2}
                  name="Humano"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Funnel */}
        <div className="rounded-xl border bg-card p-5">
          <h3 className="font-semibold mb-4">Funil de Vendas</h3>
          {funnelLoading ? (
            <ChartSkeleton />
          ) : (funnelData ?? []).every((d) => d.value === 0) ? (
            <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">
              Nenhuma oportunidade cadastrada
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={funnelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(funnelData ?? []).map((_, i) => (
                      <Cell key={i} fill={funnelColors[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {(funnelData ?? []).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: funnelColors[i] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI / Human Metrics from memoria_crm_creito */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Métricas de IA & Atendimento</h3>

        {memoriaLoading ? (
          <KPISkeleton />
        ) : !memoriaMetrics || memoriaMetrics.total_messages === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma mensagem registrada ainda
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Mensagens</span>
                  <div className="rounded-lg p-2 bg-primary/10 text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{memoriaMetrics.total_messages}</span>
                  <span className="text-xs text-muted-foreground">
                    {memoriaMetrics.unique_conversations} conversas
                  </span>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Resolução IA</span>
                  <div className="rounded-lg p-2 bg-crm-success/10 text-crm-success">
                    <Zap className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{memoriaMetrics.ai_resolution_rate}%</span>
                  <span className="text-xs text-muted-foreground">
                    {memoriaMetrics.ai_handled} resolvidas pela IA
                  </span>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Follow-ups Enviados</span>
                  <div className="rounded-lg p-2 bg-crm-warning/10 text-crm-warning">
                    <RefreshCw className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{memoriaMetrics.followup_messages}</span>
                  <span className="text-xs text-muted-foreground">remarketing automático</span>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Escalados p/ Humano</span>
                  <div className="rounded-lg p-2 bg-crm-status-ai/10 text-crm-status-ai">
                    <UserCheck className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold">{memoriaMetrics.escalated_to_human}</span>
                  <span className="text-xs text-muted-foreground">
                    score médio: {memoriaMetrics.avg_score.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* AI vs Human bar chart */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="font-semibold mb-4">Distribuição de Mensagens</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { name: "IA", valor: memoriaMetrics.ai_messages },
                    { name: "Cliente", valor: memoriaMetrics.human_messages },
                    { name: "Follow-up", valor: memoriaMetrics.followup_messages },
                    { name: "Escalados", valor: memoriaMetrics.escalated_to_human },
                  ]}
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,12%,14%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(215,12%,40%)" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="hsl(215,12%,40%)" width={80} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="valor" name="Mensagens" radius={[0, 6, 6, 0]}>
                    <Cell fill="hsl(172,66%,50%)" />
                    <Cell fill="hsl(215,76%,56%)" />
                    <Cell fill="hsl(38,85%,55%)" />
                    <Cell fill="hsl(260,55%,62%)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Leads Inteligentes — Score-based */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/10 flex items-center justify-center">
            <Star className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Leads Inteligentes</h3>
            <p className="text-xs text-muted-foreground">Classificação automática por score de engajamento</p>
          </div>
          {isSuperAdmin && companyOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="h-9 w-[200px] text-xs">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  <SelectItem value="__none__">Sem empresa</SelectItem>
                  {companyOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {leadsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-xl border bg-card p-5 animate-pulse space-y-4">
                <div className="h-5 w-40 bg-muted rounded" />
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-16 bg-muted rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !leadsData || leadsData.all.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum lead com score registrado ainda
          </div>
        ) : !filteredLeads || filteredLeads.all.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhum lead encontrado para esta empresa
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hot Leads — Prontos para Fechar */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-5 pb-3 flex items-center gap-3 border-b border-border/50">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center">
                  <Flame className="h-4.5 w-4.5 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Prontos para Fechar</h4>
                  <p className="text-[10px] text-muted-foreground">Score ≥ 70 — Alta probabilidade de conversão</p>
                </div>
                {filteredLeads.hot.length > 0 && (
                  <span className="ml-auto text-xs font-bold text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full">
                    {filteredLeads.hot.length}
                  </span>
                )}
              </div>
              <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
                {filteredLeads.hot.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum lead com score alto no momento
                  </div>
                ) : (
                  filteredLeads.hot.map((lead) => <LeadCard key={lead.id} lead={lead} variant="hot" />)
                )}
              </div>
            </div>

            {/* Warm Leads — Precisam de Atenção */}
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-5 pb-3 flex items-center gap-3 border-b border-border/50">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-yellow-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Precisam de Atenção</h4>
                  <p className="text-[10px] text-muted-foreground">Score 40-69 — Engajamento médio</p>
                </div>
                {filteredLeads.warm.length > 0 && (
                  <span className="ml-auto text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                    {filteredLeads.warm.length}
                  </span>
                )}
              </div>
              <div className="p-3 space-y-2 max-h-[320px] overflow-y-auto">
                {filteredLeads.warm.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">
                    Nenhum lead com score médio no momento
                  </div>
                ) : (
                  filteredLeads.warm.map((lead) => <LeadCard key={lead.id} lead={lead} variant="warm" />)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useNavigate } from "react-router-dom";

// ── Lead Card Component ──────────────────────────────────
function LeadCard({ lead, variant }: { lead: ScoredLead; variant: "hot" | "warm" }) {
  const navigate = useNavigate();
  const colors = {
    hot: {
      bar: "bg-gradient-to-r from-orange-500 to-red-500",
      badge: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
      glow: "hover:shadow-orange-500/5",
      btn: "text-orange-500 bg-orange-500/10 hover:bg-orange-500/20",
    },
    warm: {
      bar: "bg-gradient-to-r from-amber-500 to-yellow-500",
      badge: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
      glow: "hover:shadow-amber-500/5",
      btn: "text-amber-500 bg-amber-500/10 hover:bg-amber-500/20",
    },
  };
  const c = colors[variant];
  const daysAgo = Math.floor(
    (Date.now() - new Date(lead.created_at).getTime()) / 86400000
  );

  return (
    <div className={`group rounded-lg border bg-secondary/20 p-3.5 transition-all hover:shadow-lg ${c.glow} hover:border-border/80`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
          {lead.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{lead.name}</span>
            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ${c.badge}`}>
              {lead.score}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            {lead.phone && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Phone className="h-2.5 w-2.5" />
                {lead.phone}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground">
              {daysAgo === 0 ? "Hoje" : daysAgo === 1 ? "Ontem" : `${daysAgo}d atrás`}
            </span>
          </div>

          {/* Score bar & Button */}
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full ${c.bar} transition-all duration-500`}
                style={{ width: `${Math.min(lead.score, 100)}%` }}
              />
            </div>
            <button
              onClick={() => navigate(`/chat?contact=${lead.id}`)}
              className={`shrink-0 flex items-center justify-center h-7 w-7 rounded-md transition-colors ${c.btn}`}
              title="Abrir no Chat"
            >
              <MessageSquare className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
