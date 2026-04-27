import { Building, Users, Clock, Tag, MessageSquare, Smartphone, ChevronRight, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const allSections = [
  {
    icon: Smartphone,
    title: "WhatsApp",
    description: "Gerenciar sessões e conexões do WhatsApp",
    path: "/configuracoes/whatsapp",
    adminOnly: true,
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    borderColor: "group-hover:border-emerald-500/30",
  },
  {
    icon: Building,
    title: "Dados da Empresa",
    description: "Nome, CNPJ, logo e informações de contato",
    path: "/configuracoes/empresa",
    adminOnly: true,
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-400",
    borderColor: "group-hover:border-blue-500/30",
  },
  {
    icon: Users,
    title: "Equipe",
    description: "Gerenciar colaboradores e permissões",
    path: "/configuracoes/equipe",
    adminOnly: true,
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-400",
    borderColor: "group-hover:border-violet-500/30",
  },
  {
    icon: Clock,
    title: "Horário de Atendimento",
    description: "Definir horários de operação e mensagens de ausência",
    path: "/configuracoes/horarios",
    adminOnly: false,
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-400",
    borderColor: "group-hover:border-amber-500/30",
  },
  {
    icon: Tag,
    title: "Etiquetas",
    description: "Criar e gerenciar etiquetas para conversas e contatos",
    path: "/configuracoes/etiquetas",
    adminOnly: false,
    color: "from-pink-500/20 to-pink-500/5",
    iconColor: "text-pink-400",
    borderColor: "group-hover:border-pink-500/30",
  },
  {
    icon: MessageSquare,
    title: "Respostas Rápidas",
    description: "Templates de mensagens para agilizar o atendimento",
    path: "/configuracoes/respostas-rapidas",
    adminOnly: false,
    color: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-400",
    borderColor: "group-hover:border-cyan-500/30",
  },
];

export default function Configuracoes() {
  const navigate = useNavigate();
  const { data: role } = useUserRole();

  const isAdmin = role === "admin" || role === "super_admin";
  const sections = allSections.filter((s) => !s.adminOnly || isAdmin);

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as configurações da sua empresa
          </p>
        </div>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((s) => (
          <button
            key={s.title}
            onClick={() => s.path && navigate(s.path)}
            className={`group relative flex flex-col gap-4 rounded-2xl border bg-card p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5 ${s.borderColor}`}
          >
            {/* Gradient glow */}
            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

            <div className="relative flex items-center justify-between">
              <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center ring-1 ring-white/5`}>
                <s.icon className={`h-5 w-5 ${s.iconColor}`} />
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
            </div>

            <div className="relative">
              <h3 className="font-semibold text-sm">{s.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {s.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
