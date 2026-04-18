import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type WhatsAppSession = Tables<"whatsapp_sessions">;

/** Helper: invoke edge function and handle error shape */
async function invokeSession(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("whatsapp-sessions", { body });

  if (error) {
    // Try to extract message from response body
    const msg = typeof data === "object" && data?.error ? data.error : error.message;
    throw new Error(msg || "Erro na edge function");
  }

  // data can also contain an error from our own json({ error: ... }, 400)
  if (typeof data === "object" && data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export function useWhatsAppSessions() {
  return useQuery({
    queryKey: ["whatsapp-sessions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as WhatsAppSession[];
    },
  });
}

/** Realtime subscription — auto-invalidates query when any session row changes */
export function useRealtimeWhatsAppSessions() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("whatsapp-sessions:realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_sessions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-sessions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => invokeSession({ name }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-sessions"] }),
  });
}

export function useSessionQr(sessionId: string | null) {
  return useQuery({
    queryKey: ["whatsapp-session-qr", sessionId],
    queryFn: () => invokeSession({ action: "qr", session_id: sessionId }) as Promise<{ value: string }>,
    enabled: !!sessionId,
    refetchInterval: 3000,
  });
}

export function useSessionAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, action }: { sessionId: string; action: "start" | "stop" | "delete" | "status" }) =>
      invokeSession({ action, session_id: sessionId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-sessions"] }),
  });
}

/**
 * Sync all session statuses from WAHA API.
 * Silently fails — used on page load, should not block the UI.
 */
export function useSyncSessionStatuses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => invokeSession({ action: "sync-all" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-sessions"] }),
    // Silent — don't show errors to user for background sync
  });
}

export function useUpdateSessionWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, webhookUrl }: { sessionId: string; webhookUrl: string }) => {
      // 1. Read current row to check if webhook already exists
      const { data: row, error: readErr } = await supabase
        .from("whatsapp_sessions")
        .select("webhook_url, waha_instance_id")
        .eq("id", sessionId)
        .single();

      if (readErr) throw readErr;

      const alreadyHasWebhook = !!(row as any)?.webhook_url;

      // 2. Save in dedicated column
      const { error: writeErr } = await supabase
        .from("whatsapp_sessions")
        .update({ webhook_url: webhookUrl } as any)
        .eq("id", sessionId);

      if (writeErr) throw writeErr;

      // 3. Notify Bescale with edit flag (non-blocking)
      try {
        const { data: { user } } = await supabase.auth.getUser();

        await fetch(
          "https://webhook.bescale.ai/webhook/ea9822ac-9e4b-4a9c-82e9-8ecdba88c1d4",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              instance_name: row?.waha_instance_id,
              user_id: user?.id,
              webhook_url: webhookUrl,
              edit: alreadyHasWebhook,
            }),
          }
        );
      } catch { /* non-blocking */ }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-sessions"] }),
  });
}

export function useUpdateSessionPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId, prompt }: { sessionId: string; prompt: string }) => {
      const { error } = await supabase
        .from("whatsapp_sessions")
        .update({ prompt } as any)
        .eq("id", sessionId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-sessions"] }),
  });
}
