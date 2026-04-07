import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/supabase.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { wahaJson } from "../_shared/waha.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { userId, companyId } = await authenticateRequest(req);
    const db = getServiceClient();
    const body = await req.json();
    const { action } = body;

    // Mark as read
    if (action === "send-seen") {
      const { conversation_id } = body;
      if (!conversation_id) throw new Error("conversation_id is required");

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);

      await wahaJson(`/api/sendSeen`, {
        method: "POST",
        body: JSON.stringify({
          session: conv.whatsapp_sessions.waha_instance_id,
          chatId,
        }),
      });

      await db
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", conversation_id);

      return json({ ok: true });
    }

    // Send reaction
    if (action === "send-reaction") {
      const { conversation_id, message_id, reaction } = body;
      if (!conversation_id || !message_id) {
        throw new Error("conversation_id and message_id are required");
      }

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);

      const { data: msg } = await db
        .from("messages")
        .select("metadata")
        .eq("id", message_id)
        .single();

      const wahaMessageId = msg?.metadata?.waha_message_id;
      if (!wahaMessageId) throw new Error("Cannot react: no WAHA message ID");

      await wahaJson(`/api/reaction`, {
        method: "PUT",
        body: JSON.stringify({
          session: conv.whatsapp_sessions.waha_instance_id,
          chatId,
          messageId: wahaMessageId,
          reaction,
        }),
      });

      const reactions = (msg.metadata?.reactions as any[]) || [];
      const existing = reactions.findIndex((r: any) => r.sender_id === userId);
      if (reaction === "") {
        if (existing >= 0) reactions.splice(existing, 1);
      } else if (existing >= 0) {
        reactions[existing] = { emoji: reaction, sender_id: userId };
      } else {
        reactions.push({ emoji: reaction, sender_id: userId });
      }

      await db
        .from("messages")
        .update({ metadata: { ...msg.metadata, reactions } })
        .eq("id", message_id);

      return json({ ok: true });
    }

    // Forward message
    if (action === "forward-message") {
      const { conversation_id, message_id, target_conversation_id } = body;
      if (!conversation_id || !message_id || !target_conversation_id) {
        throw new Error("conversation_id, message_id, target_conversation_id required");
      }

      const sourceConv = await getConversation(db, conversation_id, companyId);
      const targetConv = await getConversation(db, target_conversation_id, companyId);
      const targetChatId = getChatId(targetConv.contacts);

      const { data: msg } = await db
        .from("messages")
        .select("metadata")
        .eq("id", message_id)
        .single();

      const wahaMessageId = msg?.metadata?.waha_message_id;
      if (!wahaMessageId) throw new Error("Cannot forward: no WAHA message ID");

      await wahaJson(`/api/forwardMessage`, {
        method: "POST",
        body: JSON.stringify({
          session: sourceConv.whatsapp_sessions.waha_instance_id,
          chatId: getChatId(sourceConv.contacts),
          messageId: wahaMessageId,
          chatIdTo: targetChatId,
        }),
      });

      return json({ ok: true });
    }

    // Start/stop typing
    if (action === "start-typing" || action === "stop-typing") {
      const { conversation_id } = body;
      if (!conversation_id) throw new Error("conversation_id is required");

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);
      const endpoint = action === "start-typing" ? "startTyping" : "stopTyping";

      await wahaJson(`/api/${endpoint}`, {
        method: "POST",
        body: JSON.stringify({
          session: conv.whatsapp_sessions.waha_instance_id,
          chatId,
        }),
      });

      return json({ ok: true });
    }

    // Send location
    if (action === "send-location") {
      const { conversation_id, latitude, longitude, name, address } = body;
      if (!conversation_id || latitude == null || longitude == null) {
        throw new Error("conversation_id, latitude, longitude required");
      }

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);

      await wahaJson(`/api/sendLocation`, {
        method: "POST",
        body: JSON.stringify({
          session: conv.whatsapp_sessions.waha_instance_id,
          chatId,
          latitude,
          longitude,
          name: name || "",
          address: address || "",
        }),
      });

      const locationLabel = name || address || `${latitude}, ${longitude}`;
      const { data: message, error } = await db
        .from("messages")
        .insert({
          conversation_id,
          content: locationLabel,
          sender_type: "human",
          sender_id: userId,
          media_type: "location",
          metadata: { location: { latitude, longitude, name, address } },
        })
        .select()
        .single();

      if (error) throw error;

      await db
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation_id);

      return json(message, 201);
    }

    // Send contact vCard
    if (action === "send-contact") {
      const { conversation_id, contact_name, contact_phone } = body;
      if (!conversation_id || !contact_name || !contact_phone) {
        throw new Error("conversation_id, contact_name, contact_phone required");
      }

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);

      await wahaJson(`/api/sendContactVcard`, {
        method: "POST",
        body: JSON.stringify({
          session: conv.whatsapp_sessions.waha_instance_id,
          chatId,
          contacts: [{
            fullName: contact_name,
            organization: "",
            phoneNumber: contact_phone,
            whatsappId: contact_phone.replace(/\D/g, ""),
          }],
        }),
      });

      const { data: message, error } = await db
        .from("messages")
        .insert({
          conversation_id,
          content: contact_name,
          sender_type: "human",
          sender_id: userId,
          media_type: "contact",
          metadata: { contact: { name: contact_name, phone: contact_phone } },
        })
        .select()
        .single();

      if (error) throw error;

      await db
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation_id);

      return json(message, 201);
    }

    // Send media
    if (action === "send-media") {
      const { conversation_id, media_url, media_type, caption, filename, mimetype } = body;
      if (!conversation_id || !media_url || !media_type) {
        throw new Error("conversation_id, media_url, media_type are required");
      }

      const conv = await getConversation(db, conversation_id, companyId);
      const chatId = getChatId(conv.contacts);
      const wahaSession = conv.whatsapp_sessions.waha_instance_id;

      const endpointMap: Record<string, string> = {
        image: "sendImage",
        video: "sendVideo",
        audio: "sendVoice",
        document: "sendFile",
      };

      const endpoint = endpointMap[media_type] || "sendFile";
      const fileObj: Record<string, unknown> = { url: media_url };
      if (mimetype) fileObj.mimetype = mimetype;
      if (filename) fileObj.filename = filename;

      const wahaBody: Record<string, unknown> = {
        session: wahaSession,
        chatId,
        file: fileObj,
      };
      if (media_type === "audio") {
        wahaBody.convert = true;
      } else {
        wahaBody.caption = caption || "";
      }
      await wahaJson(`/api/${endpoint}`, {
        method: "POST",
        body: JSON.stringify(wahaBody),
      });

      const { data: message, error } = await db
        .from("messages")
        .insert({
          conversation_id,
          content: caption || `[${media_type}]`,
          sender_type: "human",
          sender_id: userId,
          media_url,
          media_type,
        })
        .select()
        .single();

      if (error) throw error;

      await db
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversation_id);

      return json(message, 201);
    }

    // Send text (default)
    const { conversation_id, content, metadata } = body;
    if (!conversation_id || !content) {
      throw new Error("conversation_id and content are required");
    }

    const conv = await getConversation(db, conversation_id, companyId);
    const chatId = getChatId(conv.contacts);

    const textBody: Record<string, unknown> = {
      session: conv.whatsapp_sessions.waha_instance_id,
      chatId,
      text: content,
    };
    if (metadata?.reply_to) {
      const { data: replyMsg } = await db
        .from("messages")
        .select("metadata")
        .eq("id", metadata.reply_to)
        .single();
      if (replyMsg?.metadata?.waha_message_id) {
        textBody.reply_to = replyMsg.metadata.waha_message_id;
      }
    }

    await wahaJson(`/api/sendText`, {
      method: "POST",
      body: JSON.stringify(textBody),
    });

    const { data: message, error } = await db
      .from("messages")
      .insert({
        conversation_id,
        content,
        sender_type: "human",
        sender_id: userId,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw error;

    await db
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversation_id);

    return json(message, 201);
  } catch (err) {
    console.error(err);
    return json({ error: err.message }, 400);
  }
});

async function getConversation(db: any, conversationId: string, companyId: string) {
  const { data, error } = await db
    .from("conversations")
    .select("*, whatsapp_sessions(*), contacts(*)")
    .eq("id", conversationId)
    .eq("company_id", companyId)
    .single();

  if (error || !data) throw new Error("Conversation not found");
  return data;
}

// Get the chatId to send messages - prefer chat_id from custom_fields (supports LID),
// fallback to phone@c.us
function getChatId(contact: any): string {
  // If we stored the original chatId (e.g. 12345@lid) use it
  if (contact.custom_fields?.chat_id) {
    return contact.custom_fields.chat_id;
  }
  // Fallback: build from phone number
  if (!contact.phone) throw new Error("Contact has no phone number or chat_id");
  const digits = contact.phone.replace(/\D/g, "");
  return `${digits}@c.us`;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
