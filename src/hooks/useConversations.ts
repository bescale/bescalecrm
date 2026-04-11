import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ConversationWithContact {
  id: string;
  company_id: string;
  status: string;
  channel: string;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  session_id: string | null;
  assigned_to: string | null;
  contacts: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    company_name: string | null;
    score: number;
    score_override?: number | null;
    origin: string | null;
    notes: string | null;
    custom_fields: {
      chat_id?: string;
      avatar_url?: string;
    } | null;
    contact_tags?: {
      tag_id: string;
      tags: {
        name: string;
        color: string | null;
      } | null;
    }[];
  };
  profiles: {
    id: string;
    full_name: string;
  } | null;
  whatsapp_sessions: {
    name: string;
  } | null;
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id, company_id, status, channel, unread_count, last_message_at, created_at, session_id, assigned_to,
          contacts(id, name, phone, email, company_name, score, origin, notes, custom_fields, contact_tags(tag_id, tags(id, name, color))),
          profiles!conversations_assigned_to_fkey(id, full_name),
          whatsapp_sessions(name)
        `
        )
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as unknown as ConversationWithContact[];
    },
    staleTime: 2_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
