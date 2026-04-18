import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContactTag {
  id: string;
  name: string;
  color: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  score: number;
  origin: string | null;
  responsible_id: string | null;
  updated_at: string;
  created_at: string;
  profiles: { full_name: string } | null;
  contact_tags: { tags: ContactTag | null }[];
}

export function useContacts(sessionId?: string | null) {
  return useQuery({
    queryKey: ["contacts", sessionId ?? "all"],
    queryFn: async () => {
      // Se uma instância (session) foi selecionada, busca apenas contatos
      // que têm conversas vinculadas a essa instância
      let contactIds: string[] | null = null;

      if (sessionId) {
        const { data: convData, error: convError } = await supabase
          .from("conversations")
          .select("contact_id")
          .eq("session_id", sessionId);

        if (convError) throw convError;

        contactIds = (convData ?? [])
          .map((c) => c.contact_id)
          .filter(Boolean) as string[];

        // Nenhuma conversa encontrada para esta instância
        if (contactIds.length === 0) return [];
      }

      let query = supabase
        .from("contacts")
        .select(
          `
          id, name, phone, email, company_name, score, origin,
          responsible_id, updated_at, created_at,
          profiles!contacts_responsible_id_fkey(full_name),
          contact_tags(
            tags(id, name, color)
          )
        `
        )
        .order("updated_at", { ascending: false });

      if (contactIds !== null) {
        query = query.in("id", contactIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as Contact[];
    },
  });
}
