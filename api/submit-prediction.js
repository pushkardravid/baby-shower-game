import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}
function dataUrlToBuffer(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: "Supabase env vars are not configured." });
  }

  try {
    const body = req.body || {};
    const guestName = cleanText(body.guestName, 120);
    if (!guestName) return res.status(400).json({ error: "Guest name is required." });

    let imageUrl = cleanText(body.imageUrl, 2000);
    if (!imageUrl && body.imageDataUrl) {
      const parsed = dataUrlToBuffer(body.imageDataUrl);
      if (parsed) {
        const ext = parsed.mimeType.includes("png") ? "png" : "jpg";
        const filePath = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const upload = await supabase.storage.from("baby-images").upload(filePath, parsed.buffer, {
          contentType: parsed.mimeType,
          upsert: false
        });
        if (upload.error) throw upload.error;
        imageUrl = supabase.storage.from("baby-images").getPublicUrl(filePath).data.publicUrl;
      }
    }

    const row = {
      guest_name: guestName,
      baby_calls_me: cleanText(body.babyCallsMe, 120),
      gender_guess: cleanText(body.genderGuess, 50),
      eyes_guess: cleanText(body.eyesGuess, 50),
      smile_guess: cleanText(body.smileGuess, 50),
      mom_percent: Number.isFinite(Number(body.momPercent)) ? Number(body.momPercent) : null,
      message: cleanText(body.message, 1000),
      image_url: imageUrl || null,
      game2_responses: body.game2Responses || {}
    };

    const { data, error } = await supabase.from("guest_predictions").insert(row).select("id, image_url").single();
    if (error) throw error;
    return res.status(200).json({ ok: true, id: data.id, imageUrl: data.image_url });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Failed to submit prediction." });
  }
}
