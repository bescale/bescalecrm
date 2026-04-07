import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { wahaFetch } from "../_shared/waha.ts";

// Proxy media files from WAHA to the browser.
// WAHA media URLs require an API key header that browsers can't send via <img>/<video> tags.
// This edge function fetches from WAHA and streams the binary back.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Authorization",
      },
    });
  }

  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const mediaUrl = url.searchParams.get("url");

  if (!mediaUrl) {
    return new Response("Missing ?url= parameter", { status: 400 });
  }

  try {
    let wahaPath: string;
    try {
      wahaPath = new URL(mediaUrl).pathname;
    } catch {
      // If it's already a path, use directly
      wahaPath = mediaUrl;
    }

    const res = await wahaFetch(wahaPath, {
      headers: { "Accept": "*/*", "Content-Type": "" },
    });

    if (!res.ok) {
      console.error("WAHA media fetch failed:", res.status, await res.text());
      return new Response("Media not found", { status: res.status });
    }

    const resContentType = res.headers.get("content-type") || "";

    let body: Uint8Array;
    let contentType: string;

    // WAHA may return JSON {mimetype, data} with base64 instead of binary
    if (resContentType.includes("application/json")) {
      const json = await res.json();
      if (json.data) {
        const raw = atob(json.data);
        body = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) body[i] = raw.charCodeAt(i);
        contentType = json.mimetype || "application/octet-stream";
      } else {
        return new Response("No media data", { status: 404 });
      }
    } else {
      body = new Uint8Array(await res.arrayBuffer());
      contentType = resContentType || "application/octet-stream";
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Media proxy error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
