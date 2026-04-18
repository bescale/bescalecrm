import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DollarSign, Calendar, User, GripVertical, MessageCircle } from "lucide-react";
import type { OpportunityRow } from "@/hooks/useOpportunities";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

interface KanbanCardProps {
  opportunity: OpportunityRow;
  onClick: () => void;
  onWhatsApp?: () => void;
}

export default function KanbanCard({ opportunity, onClick, onWhatsApp }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opportunity.id,
    data: { type: "card", opportunity },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const tags = opportunity.opportunity_tags
    ?.map((ot) => ot.tags)
    .filter(Boolean) as { id: string; name: string; color: string | null }[];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card rounded-lg border p-4 space-y-3 cursor-grab hover:shadow-md transition-shadow group"
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-sm leading-snug">{opportunity.title}</h4>
        <div className="flex items-center gap-1 shrink-0">
          {opportunity.contacts?.phone && onWhatsApp && (
            <button
              onClick={(e) => { e.stopPropagation(); onWhatsApp(); }}
              className="text-muted-foreground/0 group-hover:text-green-500 hover:text-green-600 transition-colors"
              title="Abrir WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
          <GripVertical className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/50" />
        </div>
      </div>

      {opportunity.contacts && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          {opportunity.contacts.name}
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <DollarSign className="h-3 w-3 text-crm-success" />
          {formatCurrency(opportunity.value)}
        </span>
        {opportunity.expected_close_date && (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(opportunity.expected_close_date)}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {tags?.map((tag) => (
            <span
              key={tag.id}
              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: tag.color ? `${tag.color}20` : undefined,
                color: tag.color || undefined,
              }}
            >
              {tag.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-12 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${opportunity.probability}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{opportunity.probability}%</span>
        </div>
      </div>

      {opportunity.profiles && (
        <div className="text-[11px] text-muted-foreground">
          Resp: {opportunity.profiles.full_name}
        </div>
      )}
    </div>
  );
}
