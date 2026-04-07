import { Building, Users, Clock, Tag, MessageSquare, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = [
  { icon: Smartphone, title: "WhatsApp", description: "Gerenciar sessões e conexões do WhatsApp", path: "/configuracoes/whatsapp" },
  { icon: Building, title: "Dados da Empresa", description: "Nome, CNPJ, logo e informações de contato", path: "/configuracoes/empresa" },
  { icon: Users, title: "Equipe", description: "Gerenciar colaboradores e permissões", path: "/configuracoes/equipe" },
  { icon: Clock, title: "Horário de Atendimento", description: "Definir horários de operação e mensagens de ausência", path: "/configuracoes/horarios" },
  { icon: Tag, title: "Etiquetas", description: "Criar e gerenciar etiquetas para conversas e contatos", path: "/configuracoes/etiquetas" },
  { icon: MessageSquare, title: "Respostas Rápidas", description: "Templates de mensagens para agilizar o atendimento", path: "/configuracoes/respostas-rapidas" },
];

export default function Configuracoes() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie as configurações da sua empresa</p>
      </div>

      <div className="space-y-3">
        {sections.map((s) => (
          <button
            key={s.title}
            onClick={() => s.path && navigate(s.path)}
            className="w-full flex items-center gap-4 rounded-xl border bg-card p-5 text-left hover:shadow-sm hover:border-primary/30 transition-all"
          >
            <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <s.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{s.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
