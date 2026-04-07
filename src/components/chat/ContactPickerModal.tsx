import { useState } from "react";
import { Search, User, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ContactPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (contact: { name: string; phone: string }) => void;
  sending: boolean;
}

export default function ContactPickerModal({
  open,
  onClose,
  onSelect,
  sending,
}: ContactPickerModalProps) {
  const [search, setSearch] = useState("");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone")
        .not("phone", "is", null)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filtered = contacts?.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
  );

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar contato</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar contato..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border bg-secondary/50 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="max-h-64 overflow-auto space-y-1">
            {isLoading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {filtered?.map((contact) => (
              <button
                key={contact.id}
                onClick={() =>
                  onSelect({ name: contact.name, phone: contact.phone! })
                }
                disabled={sending}
                className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-secondary transition-colors text-left disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.phone}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
