import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Message } from "./useMessages";

export function useRealtimeMessages(conversationId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          queryClient.setQueryData<Message[]>(
            ["messages", conversationId],
            (old) => {
              if (!old) return [newMessage];
              if (old.some((m) => m.id === newMessage.id)) return old;
              return [...old, newMessage];
            }
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          queryClient.setQueryData<Message[]>(
            ["messages", conversationId],
            (old) =>
              old?.map((m) => (m.id === updated.id ? updated : m)) ?? []
          );
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] messages channel connected:", conversationId);
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[Realtime] messages channel error:", status, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);
}

export function useRealtimeConversations() {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedInvalidate = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }, 500);
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("conversations:all")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
        },
        () => {
          debouncedInvalidate();
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] conversations channel connected");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[Realtime] conversations channel error:", status, err);
        }
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient, debouncedInvalidate]);
}
