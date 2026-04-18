import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  sender_type: string;
  sender_id: string | null;
  media_url: string | null;
  media_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Message[];
    },
    enabled: !!conversationId,
  });
}
