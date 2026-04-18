import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { wahaJson } from "../_shared/waha.ts";

function mapWahaStatus(wahaStatus: string): string {
  if (wahaStatus === "WORKING") return "connected";
  if (wahaStatus === "SCAN_QR_CODE" || wahaStatus === "STARTING") return "starting";
  return "disconnected";
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getSession(db: ReturnType<typeof getServiceClient>, id: string, companyId: string) {
  const { data, error } = await db
    .from("whatsapp_sessions")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .single();
  if (error || !data) throw new Error("Session not found");
  return data;
}

async function syncOne(db: ReturnType<typeof getServiceClient>, session: Record<string, unknown>) {
  let status = "disconnected";
  let phone = session.phone_number as string | null;

  try {
    const info = await wahaJson<{ status: string }>(`/api/sessions/${session.waha_instance_id}`);
    status = mapWahaStatus(info.status);
  } catch (_) {
    status = "disconnected";
  }

  if (status === "connected") {
    try {
      const me = await wahaJson<{ id?: string }>(`/api/sessions/${session.waha_instance_id}/me`);
      if (me?.id) phone = me.id.replace("@c.us", "");
    } catch (_) { /* ignore */ }
  }

  await db
    .from("whatsapp_sessions")
    .update({ status, phone_number: phone })
    .eq("id", session.id);

  return { ...session, status, phone_number: phone };
}

serve(async (req: Request) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { userId, companyId } = await authenticateRequest(req);
    const db = getServiceClient();

    /* ─── POST ─── */
    if (req.method === "POST") {
      const body = await req.json();
      const action: string = body.action || "";
      const sessionId: string = body.session_id || "";

      /* sync-all */
      if (action === "sync-all") {
        const { data: rows } = await db
          .from("whatsapp_sessions")
          .select("*")
          .eq("company_id", companyId);

        const results = await Promise.allSettled(
          (rows || []).map((s: Record<string, unknown>) => syncOne(db, s))
        );

        return json({
          synced: results.filter((r) => r.status === "fulfilled").length,
          total: rows?.length || 0,
        });
      }

      /* qr */
      if (action === "qr" && sessionId) {
        const session = await getSession(db, sessionId, companyId);
        const qr = await wahaJson<{ mimetype: string; data: string }>(
          `/api/${session.waha_instance_id}/auth/qr`
        );
        return json({ value: qr.data, mimetype: qr.mimetype });
      }

      /* create */
      if (!action || action === "create") {
        const name: string = body.name;
        if (!name) throw new Error("name is required");

        const wahaId = `company_${companyId}_${name.toLowerCase().replace(/\s+/g, "_")}`;
        const supaUrl = Deno.env.get("SUPABASE_URL")!;
        const secret = Deno.env.get("WEBHOOK_SECRET")!;
        const hookUrl = `${supaUrl}/functions/v1/whatsapp-webhook?secret=${secret}`;

        const wahaConfig: Record<string, unknown> = {
          webhooks: [{
            url: hookUrl,
            events: ["message", "message.any", "message.ack", "session.status"],
            retries: { delaySeconds: 2, attempts: 15, policy: "constant" },
          }],
          // Desativar chats de status, grupos, canais e broadcast
          ignore: {
            status: true,
            groups: true,
            channels: true,
            broadcast: true,
            ...(body.config?.ignore || {}),
          },
        };

        await wahaJson("/api/sessions", {
          method: "POST",
          body: JSON.stringify({
            name: wahaId,
            start: true,
            config: wahaConfig,
          }),
        });

        const { data, error } = await db
          .from("whatsapp_sessions")
          .insert({
            company_id: companyId,
            name,
            waha_instance_id: wahaId,
            status: "starting",
          })
          .select()
          .single();

        if (error) throw error;
        return json(data, 201);
      }

      /* start */
      if (action === "start" && sessionId) {
        const session = await getSession(db, sessionId, companyId);
        await wahaJson(`/api/sessions/${session.waha_instance_id}/start`, { method: "POST" });
        await db.from("whatsapp_sessions").update({ status: "starting" }).eq("id", sessionId);
        return json({ ok: true });
      }

      /* stop */
      if (action === "stop" && sessionId) {
        const session = await getSession(db, sessionId, companyId);
        await wahaJson(`/api/sessions/${session.waha_instance_id}/stop`, { method: "POST" });
        await db.from("whatsapp_sessions").update({ status: "disconnected" }).eq("id", sessionId);
        return json({ ok: true });
      }

      /* update-webhook — extra webhook, does NOT touch WAHA config */
      if (action === "update-webhook" && sessionId) {
        const webhookUrl: string = body.webhook_url || "";
        if (!webhookUrl) throw new Error("webhook_url is required");

        const session = await getSession(db, sessionId, companyId);
        const alreadyHasWebhook = !!(session as Record<string, unknown>).webhook_url;

        // 1. Save in dedicated column
        await db
          .from("whatsapp_sessions")
          .update({ webhook_url: webhookUrl })
          .eq("id", sessionId);

        // 2. Notify Bescale with edit flag (non-blocking)
        try {
          await fetch(
            "https://webhook.bescale.ai/webhook/ea9822ac-9e4b-4a9c-82e9-8ecdba88c1d4",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                instance_name: session.waha_instance_id,
                user_id: userId,
                webhook_url: webhookUrl,
                edit: alreadyHasWebhook,
              }),
            }
          );
        } catch (_) { /* non-blocking */ }

        return json({ ok: true });
      }

      /* update-prompt — saved in dedicated column */
      if (action === "update-prompt" && sessionId) {
        const prompt: string = body.prompt ?? "";
        await db
          .from("whatsapp_sessions")
          .update({ prompt })
          .eq("id", sessionId);
        return json({ ok: true });
      }

      /* delete */
      if (action === "delete" && sessionId) {
        const session = await getSession(db, sessionId, companyId);
        try {
          await wahaJson(`/api/sessions/${session.waha_instance_id}`, { method: "DELETE" });
        } catch (_) { /* may already be gone */ }
        await db.from("whatsapp_sessions").delete().eq("id", sessionId);
        return json({ ok: true });
      }

      return json({ error: "Unknown action" }, 400);
    }

    /* ─── GET ─── */
    if (req.method === "GET") {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("session_id");
      const act = url.searchParams.get("action");

      if (sessionId && act === "qr") {
        const session = await getSession(db, sessionId, companyId);
        const qr = await wahaJson<{ mimetype: string; data: string }>(
          `/api/${session.waha_instance_id}/auth/qr`
        );
        return json({ value: qr.data, mimetype: qr.mimetype });
      }

      if (sessionId && act === "status") {
        const session = await getSession(db, sessionId, companyId);
        return json(await syncOne(db, session));
      }

      // List all
      const { data, error } = await db
        .from("whatsapp_sessions")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return json(data);
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("whatsapp-sessions error:", msg);
    return json({ error: msg }, 400);
  }
});
