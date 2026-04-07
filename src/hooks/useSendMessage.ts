import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Message } from "./useMessages";

interface SendTextParams {
  conversation_id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: SendTextParams) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: params }
      );
      if (error) throw error;
      return data;
    },
    onMutate: async (params) => {
      const key = ["messages", params.conversation_id];
      await queryClient.cancelQueries({ queryKey: key });

      const optimistic: Message = {
        id: `temp-${Date.now()}`,
        conversation_id: params.conversation_id,
        content: params.content,
        sender_type: "human",
        sender_id: user?.id || null,
        media_url: null,
        media_type: null,
        metadata: params.metadata || null,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Message[]>(key, (old) =>
        old ? [...old, optimistic] : [optimistic]
      );

      return { key };
    },
    onSettled: (_data, _error, params) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", params.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      media_url: string;
      media_type: string;
      caption?: string;
      filename?: string;
      mimetype?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { ...params, action: "send-media" } }
      );
      if (error) throw error;
      return data;
    },
    onSettled: (_data, _error, params) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", params.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      message_id: string;
      reaction: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { ...params, action: "send-reaction" } }
      );
      if (error) throw error;
      return data;
    },
    onSettled: (_data, _error, params) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", params.conversation_id],
      });
    },
  });
}

export function useForwardMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      message_id: string;
      target_conversation_id: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { ...params, action: "forward-message" } }
      );
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useMarkAsRead() {
  return useMutation({
    mutationFn: async (conversation_id: string) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { action: "send-seen", conversation_id } }
      );
      if (error) throw error;
      return data;
    },
    // Realtime subscription already handles the refetch — no manual invalidation needed
  });
}

export function useTypingIndicator() {
  const lastSentRef = useRef(0);

  const sendTyping = async (conversationId: string, action: "start-typing" | "stop-typing") => {
    try {
      await supabase.functions.invoke("whatsapp-messages", {
        body: { action, conversation_id: conversationId },
      });
    } catch {
      // fire-and-forget
    }
  };

  const startTyping = (conversationId: string) => {
    const now = Date.now();
    if (now - lastSentRef.current < 3000) return;
    lastSentRef.current = now;
    sendTyping(conversationId, "start-typing");
  };

  const stopTyping = (conversationId: string) => {
    lastSentRef.current = 0;
    sendTyping(conversationId, "stop-typing");
  };

  return { startTyping, stopTyping };
}

export function useSendContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      contact_name: string;
      contact_phone: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { ...params, action: "send-contact" } }
      );
      if (error) throw error;
      return data;
    },
    onSettled: (_data, _error, params) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", params.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useSendLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      conversation_id: string;
      latitude: number;
      longitude: number;
      name?: string;
      address?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-messages",
        { body: { ...params, action: "send-location" } }
      );
      if (error) throw error;
      return data;
    },
    onSettled: (_data, _error, params) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", params.conversation_id],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
