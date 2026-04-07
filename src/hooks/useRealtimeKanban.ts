import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRealtimeKanban() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("kanban:realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "opportunities" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["opportunities"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pipeline_stages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] kanban channel connected");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error("[Realtime] kanban channel error:", status, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
