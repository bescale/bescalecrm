import { Bot, Plus, MoreVertical, Zap, Clock, MessageSquare, Power } from "lucide-react";

const agents = [
  {
    id: "1",
    name: "Agente Vendas",
    description: "Qualifica leads interessados nos planos Pro e Enterprise",
    session: "WhatsApp Principal",
    status: "active" as const,
    conversations: 234,
    qualified: 67,
    avgResponse: "1.8s",
    schedule: "Seg-Sex, 8h-20h",
  },
  {
    id: "2",
    name: "Agente Suporte",
    description: "Atende dúvidas frequentes e direciona para equipe técnica",
    session: "WhatsApp Suporte",
    status: "active" as const,
    conversations: 156,
    qualified: 42,
    avgResponse: "2.1s",
    schedule: "Todos os dias, 24h",
  },
  {
    id: "3",
    name: "Agente Follow-up",
    description: "Reengage leads inativos com mensagens de nutrição",
    session: "WhatsApp Principal",
    status: "inactive" as const,
    conversations: 89,
    qualified: 12,
    avgResponse: "1.5s",
    schedule: "Seg-Sex, 9h-18h",
  },
];

export default function Agentes() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agentes de IA</h1>
          <p className="text-muted-foreground text-sm">Configure e gerencie seus agentes inteligentes</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> Novo Agente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{agent.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        agent.status === "active" ? "bg-crm-success animate-pulse-soft" : "bg-crm-status-closed"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {agent.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                </div>
              </div>
              <button className="rounded-lg p-1.5 hover:bg-secondary transition-colors">
                <MoreVertical className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">{agent.description}</p>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-secondary/70 p-3">
                <MessageSquare className="h-4 w-4 mx-auto text-crm-info mb-1" />
                <p className="text-lg font-bold">{agent.conversations}</p>
                <p className="text-[10px] text-muted-foreground">Conversas</p>
              </div>
              <div className="rounded-lg bg-secondary/70 p-3">
                <Zap className="h-4 w-4 mx-auto text-crm-success mb-1" />
                <p className="text-lg font-bold">{agent.qualified}</p>
                <p className="text-[10px] text-muted-foreground">Qualificados</p>
              </div>
              <div className="rounded-lg bg-secondary/70 p-3">
                <Clock className="h-4 w-4 mx-auto text-crm-warning mb-1" />
                <p className="text-lg font-bold">{agent.avgResponse}</p>
                <p className="text-[10px] text-muted-foreground">Resposta</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
              <span>Sessão: {agent.session}</span>
              <span>{agent.schedule}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
