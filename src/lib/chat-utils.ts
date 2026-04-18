export type ConversationStatus = "ai" | "human" | "waiting" | "unassigned" | "closed" | "queue";

export const statusConfig: Record<ConversationStatus, { label: string; class: string }> = {
  ai: { label: "IA", class: "bg-crm-status-ai/15 text-crm-status-ai" },
  human: { label: "Humano", class: "bg-crm-status-human/15 text-crm-status-human" },
  waiting: { label: "Aguardando", class: "bg-crm-status-waiting/15 text-crm-status-waiting" },
  unassigned: { label: "Sem atendente", class: "bg-crm-status-unassigned/15 text-crm-status-unassigned" },
  closed: { label: "Finalizada", class: "bg-crm-status-closed/15 text-crm-status-closed" },
  queue: { label: "Em espera", class: "bg-crm-status-queue/15 text-crm-status-queue" },
};

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

export function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

export function formatMessageTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPhone(phone: string | null): string {
  if (!phone) return "Sem telefone";
  const digits = phone.replace(/\D/g, "");
  // Brazilian format: +55 (11) 99999-9999
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  // Generic international
  if (digits.length > 10) {
    return `+${digits}`;
  }
  return phone;
}
