import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { DollarSign, Calendar, User, MessageCircle, Pencil, Trash2 } from "lucide-react";
import type { OpportunityRow } from "@/hooks/useOpportunities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

interface OpportunityDetailProps {
  opportunity: OpportunityRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (opp: OpportunityRow) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (opp: OpportunityRow) => void;
}

export default function OpportunityDetail({
  opportunity,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onWhatsApp,
}: OpportunityDetailProps) {
  if (!opportunity) return null;

  const tags = opportunity.opportunity_tags
    ?.map((ot) => ot.tags)
    .filter(Boolean) as { id: string; name: string; color: string | null }[];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[420px] overflow-auto">
        <SheetHeader>
          <SheetTitle>{opportunity.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-crm-success" />
            <span className="font-semibold">{formatCurrency(opportunity.value)}</span>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Probabilidade:</span>
            <div className="h-2 w-24 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${opportunity.probability}%` }}
              />
            </div>
            <span>{opportunity.probability}%</span>
          </div>

          {opportunity.contacts && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{opportunity.contacts.name}</span>
              {opportunity.contacts.phone && (
                <span className="text-xs text-muted-foreground">({opportunity.contacts.phone})</span>
              )}
            </div>
          )}

          {opportunity.profiles && (
            <div className="text-sm">
              <span className="text-muted-foreground">Responsavel: </span>
              <span>{opportunity.profiles.full_name}</span>
            </div>
          )}

          {opportunity.expected_close_date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {new Date(opportunity.expected_close_date).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}

          {tags?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}20` : undefined,
                    color: tag.color || undefined,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          {opportunity.notes && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-1">Notas</p>
              <p className="whitespace-pre-wrap">{opportunity.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => onEdit(opportunity)}>
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Editar
            </Button>

            {opportunity.contacts?.phone && (
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 hover:text-green-700"
                onClick={() => onWhatsApp(opportunity)}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1" />
                WhatsApp
              </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive ml-auto">
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acao nao pode ser desfeita. A oportunidade "{opportunity.title}" sera excluida permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => { onDelete(opportunity.id); onOpenChange(false); }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
