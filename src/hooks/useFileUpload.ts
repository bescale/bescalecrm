import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UploadResult {
  url: string;
  mediaType: "image" | "video" | "audio" | "document";
}

function detectMediaType(mimeType: string): UploadResult["mediaType"] {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (file: File): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      const ext = file.name.split(".").pop() || "bin";
      const uid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const path = `uploads/${uid}.${ext}`;

      const { error } = await supabase.storage
        .from("chat-media")
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) throw error;

      const { data } = supabase.storage
        .from("chat-media")
        .getPublicUrl(path);

      setProgress(100);

      return {
        url: data.publicUrl,
        mediaType: detectMediaType(file.type),
      };
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress };
}
