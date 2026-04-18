import {
  MessageSquare,
  TrendingUp,
  DollarSign,
  Bot,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
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
} from "recharts";
import {
  useDashboardKPIs,
  useConversationsByDay,
  useFunnelData,
  useAttendantPerformance,
} from "@/hooks/useDashboardData";

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
  const { data: attendants, isLoading: attendantsLoading } = useAttendantPerformance();

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

      {/* Attendants table */}
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold mb-4">Performance dos Atendentes</h3>
        {attendantsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="ml-auto flex gap-8">
                  <div className="h-4 w-8 bg-muted rounded" />
                  <div className="h-4 w-8 bg-muted rounded" />
                  <div className="h-4 w-16 bg-muted rounded" />
                  <div className="h-4 w-10 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (attendants ?? []).length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            Nenhum atendente com conversas atribuídas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left pb-3 font-medium">Atendente</th>
                  <th className="text-center pb-3 font-medium">Conversas</th>
                  <th className="text-center pb-3 font-medium">Resolvidas</th>
                  <th className="text-center pb-3 font-medium">Tempo Médio</th>
                  <th className="text-center pb-3 font-medium">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {(attendants ?? []).map((a) => {
                  const rate =
                    a.conversations > 0
                      ? Math.round((a.resolved / a.conversations) * 100)
                      : 0;
                  return (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-3 flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                          {a.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        {a.name}
                      </td>
                      <td className="text-center py-3">{a.conversations}</td>
                      <td className="text-center py-3">{a.resolved}</td>
                      <td className="text-center py-3">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {a.avgResponseTime}
                        </span>
                      </td>
                      <td className="text-center py-3">
                        <span className="text-crm-success font-medium">{rate}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
