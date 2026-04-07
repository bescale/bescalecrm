import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { wahaJson, wahaFetch } from "../_shared/waha.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  if (secret !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const data = await req.json();
    const db = getServiceClient();

    const event = data.event;
    const sessionName = data.session;

    // Ignore messages sent by the bot itself
    if (event === "message" && data.payload?.fromMe) {
      return ok({ skipped: "fromMe" });
    }

    if (event === "message") {
      await handleMessage(db, sessionName, data);
    } else if (event === "message.reaction") {
      await handleReaction(db, sessionName, data.payload);
    } else if (event === "message.ack") {
      await handleAck(db, data.payload);
    } else if (event === "session.status") {
      await handleSessionStatus(db, sessionName, data.payload);
    }

    return ok();
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

function ok(extra?: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok: true, ...extra }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleMessage(db: any, sessionName: string, data: any) {
  const payload = data.payload;
  const { from, body, hasMedia, id, timestamp } = payload;

  // 1. Find session
  const { data: session, error: sessErr } = await db
    .from("whatsapp_sessions")
    .select("id, company_id")
    .eq("waha_instance_id", sessionName)
    .single();

  if (sessErr || !session) {
    console.error("Session not found for:", sessionName);
    return;
  }

  const companyId = session.company_id;
  const sessionId = session.id;

  // 2. Resolve phone number - handle both @c.us and @lid formats
  const chatId = from; // Original chatId for sending messages back
  let phone: string;

  if (from.endsWith("@lid")) {
    // Resolve LID to real phone number via WAHA API
    const lidNumber = from.replace("@lid", "");
    try {
      const resolved = await wahaJson<{ lid: string; pn: string | null }>(
        `/api/${sessionName}/lids/${lidNumber}`
      );
      if (resolved?.pn) {
        phone = resolved.pn.replace("@c.us", "").replace(/\D/g, "");
      } else {
        phone = lidNumber; // Fallback if unresolvable
      }
    } catch {
      phone = lidNumber;
    }
  } else {
    phone = from.replace(/@.*$/, "").replace(/\D/g, "");
  }

  // 3. Get contact name from webhook payload
  let contactName = payload._data?.notifyName || "";
  if (!contactName) {
    try {
      const contactInfo = await wahaJson<{ pushname?: string; name?: string }>(
        `/api/contacts?session=${sessionName}&contactId=${encodeURIComponent(chatId)}`
      );
      contactName = contactInfo?.pushname || contactInfo?.name || "";
    } catch { /* keep empty */ }
  }
  if (!contactName) contactName = phone;

  // 4. Get profile picture
  let avatarUrl: string | null = null;
  try {
    const pic = await wahaJson<{ profilePictureURL?: string }>(
      `/api/contacts/profile-picture?session=${sessionName}&contactId=${encodeURIComponent(chatId)}`
    );
    if (pic?.profilePictureURL) avatarUrl = pic.profilePictureURL;
  } catch { /* no picture */ }

  // 5. Find or create contact
  let { data: contact } = await db
    .from("contacts")
    .select("id, custom_fields")
    .eq("company_id", companyId)
    .or(`phone.eq.${phone},custom_fields->>chat_id.eq.${chatId}`)
    .maybeSingle();

  if (!contact) {
    const customFields: Record<string, unknown> = { chat_id: chatId };
    if (avatarUrl) customFields.avatar_url = avatarUrl;

    const { data: newContact, error: contactErr } = await db
      .from("contacts")
      .insert({
        company_id: companyId,
        name: contactName,
        phone,
        origin: "whatsapp",
        custom_fields: customFields,
      })
      .select("id, custom_fields")
      .single();

    if (contactErr) throw contactErr;
    contact = newContact;
  } else {
    // Update name/avatar if we have better data
    const updates: Record<string, unknown> = {};
    const cfUpdates = { ...contact.custom_fields, chat_id: chatId };

    if (avatarUrl && contact.custom_fields?.avatar_url !== avatarUrl) {
      cfUpdates.avatar_url = avatarUrl;
    }
    updates.custom_fields = cfUpdates;

    if (contactName && contactName !== phone) {
      updates.name = contactName;
    }
    updates.phone = phone;

    await db.from("contacts").update(updates).eq("id", contact.id);
  }

  // 6. Find or create conversation
  let { data: conversation } = await db
    .from("conversations")
    .select("id, unread_count")
    .eq("contact_id", contact.id)
    .eq("session_id", sessionId)
    .neq("status", "closed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conversation) {
    const { data: newConv, error: convErr } = await db
      .from("conversations")
      .insert({
        company_id: companyId,
        contact_id: contact.id,
        session_id: sessionId,
        channel: "whatsapp",
        status: "unassigned",
        last_message_at: new Date().toISOString(),
      })
      .select("id, unread_count")
      .single();

    if (convErr) throw convErr;
    conversation = newConv;
  }

  // 7. Deduplication
  const { data: existing } = await db
    .from("messages")
    .select("id")
    .eq("conversation_id", conversation.id)
    .contains("metadata", { waha_message_id: id })
    .maybeSingle();

  if (existing) return;

  // 8. Insert message
  const messageData: any = {
    conversation_id: conversation.id,
    content: body || "",
    sender_type: "lead",
    metadata: { waha_message_id: id, timestamp, chat_id: chatId },
  };

  // WAHA media structure: payload.media = { url, mimetype, filename, error }
  const media = payload.media;
  if (hasMedia && media?.url && !media.error) {
    // Derive media type from mimetype (e.g. "image/jpeg" -> "image")
    const mediaType = media.mimetype?.split("/")[0] || "document";
    const publicUrl = await downloadAndStoreMedia(
      db,
      media.url,
      mediaType,
      media.mimetype || "",
      companyId,
      conversation.id,
      media.filename || null,
    );
    messageData.media_url = publicUrl || media.url;
    messageData.media_type = mediaType;
  }

  const { error: msgErr } = await db.from("messages").insert(messageData);
  if (msgErr) throw msgErr;

  // 9. Update conversation
  await db
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      unread_count: (conversation.unread_count || 0) + 1,
    })
    .eq("id", conversation.id);
}

function extFromMime(mimetype: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp",
    "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/amr": "amr",
    "video/mp4": "mp4", "video/3gpp": "3gp",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/msword": "doc", "application/vnd.ms-excel": "xls",
    "text/plain": "txt", "application/zip": "zip",
  };
  return map[mimetype] || mimetype.split("/").pop()?.split(";")[0] || "bin";
}

async function downloadAndStoreMedia(
  db: any,
  wahaMediaUrl: string,
  mediaType: string,
  mimetype: string,
  companyId: string,
  conversationId: string,
  originalFilename: string | null,
): Promise<string | null> {
  try {
    // media.url from WAHA is a full URL like http://host:port/api/files/...
    // We need just the path to combine with WAHA_API_URL via wahaFetch
    let wahaPath: string;
    try {
      wahaPath = new URL(wahaMediaUrl).pathname;
    } catch {
      wahaPath = wahaMediaUrl;
    }

    console.log("Downloading media from WAHA:", wahaPath, "mimetype:", mimetype);

    // Override Accept to get binary file, not JSON {mimetype, data}
    const res = await wahaFetch(wahaPath, {
      headers: { "Accept": "*/*", "Content-Type": "" },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("WAHA media download failed:", res.status, errText);
      return null;
    }

    const resContentType = res.headers.get("content-type") || "";
    let fileBytes: Uint8Array;
    let contentType = mimetype || resContentType || "application/octet-stream";

    if (resContentType.includes("application/json")) {
      // WAHA returned JSON with base64 data instead of binary
      const json = await res.json();
      if (json.data) {
        const raw = atob(json.data);
        fileBytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) fileBytes[i] = raw.charCodeAt(i);
        if (json.mimetype) contentType = json.mimetype;
      } else {
        console.error("WAHA JSON without data:", JSON.stringify(json).slice(0, 300));
        return null;
      }
    } else {
      fileBytes = new Uint8Array(await res.arrayBuffer());
      if (!mimetype && resContentType) contentType = resContentType;
    }

    if (fileBytes.length === 0) {
      console.error("Downloaded media is empty (0 bytes)");
      return null;
    }

    // Build filename: companyId/conversationId/uuid.ext
    const ext = originalFilename
      ? originalFilename.split(".").pop() || extFromMime(contentType)
      : extFromMime(contentType);
    const fileName = `${companyId}/${conversationId}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadErr } = await db.storage
      .from("chat-media")
      .upload(fileName, fileBytes, { contentType, upsert: false });

    if (uploadErr) {
      console.error("Storage upload error:", JSON.stringify(uploadErr));
      return null;
    }

    const { data: urlData } = db.storage
      .from("chat-media")
      .getPublicUrl(fileName);

    console.log("Media uploaded OK:", fileName, fileBytes.length, "bytes", contentType);
    return urlData?.publicUrl || null;
  } catch (err) {
    console.error("downloadAndStoreMedia error:", err);
    return null;
  }
}

async function handleAck(db: any, payload: any) {
  const { id, ack } = payload;
  if (!id) return;

  const { data: messages } = await db
    .from("messages")
    .select("id, metadata")
    .contains("metadata", { waha_message_id: id })
    .limit(1);

  if (messages && messages.length > 0) {
    const msg = messages[0];
    await db
      .from("messages")
      .update({ metadata: { ...msg.metadata, ack } })
      .eq("id", msg.id);
  }
}

async function handleReaction(db: any, _sessionName: string, payload: any) {
  const { id, reaction, from } = payload;
  if (!id) return;

  const { data: messages } = await db
    .from("messages")
    .select("id, metadata")
    .contains("metadata", { waha_message_id: id })
    .limit(1);

  if (!messages || messages.length === 0) return;

  const msg = messages[0];
  const reactions = (msg.metadata?.reactions as any[]) || [];
  const senderId = from || "contact";

  const existing = reactions.findIndex((r: any) => r.sender_id === senderId);
  if (!reaction?.text) {
    if (existing >= 0) reactions.splice(existing, 1);
  } else if (existing >= 0) {
    reactions[existing] = { emoji: reaction.text, sender_id: senderId };
  } else {
    reactions.push({ emoji: reaction.text, sender_id: senderId });
  }

  await db
    .from("messages")
    .update({ metadata: { ...msg.metadata, reactions } })
    .eq("id", msg.id);
}

async function handleSessionStatus(db: any, sessionName: string, payload: any) {
  let status: string;
  switch (payload.status) {
    case "WORKING":
      status = "connected";
      break;
    case "SCAN_QR_CODE":
    case "STARTING":
      status = "starting";
      break;
    default:
      status = "disconnected";
  }

  const update: Record<string, unknown> = { status };

  // Fetch phone number when connected
  if (status === "connected") {
    try {
      const me = await wahaJson<{ id?: string }>(
        `/api/sessions/${sessionName}/me`
      );
      if (me?.id) update.phone_number = me.id.replace("@c.us", "");
    } catch { /* ignore */ }
  }

  await db
    .from("whatsapp_sessions")
    .update(update)
    .eq("waha_instance_id", sessionName);
}
