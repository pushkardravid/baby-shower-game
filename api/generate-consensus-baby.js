import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function isAuthed(req) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return true;
  const actual = req.headers["x-admin-password"];
  return actual === expected;
}

async function imageUrlToFile(url, index) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch image ${index + 1}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return await toFile(buffer, `prediction-${index + 1}.png`, { type: "image/png" });
}

async function uploadConsensusImage(b64, predictionCount) {
  const buffer = Buffer.from(b64, "base64");
  const filePath = `consensus-${Date.now()}-${crypto.randomUUID()}.png`;

  const upload = await supabase.storage.from("baby-images").upload(filePath, buffer, {
    contentType: "image/png",
    upsert: false
  });

  if (upload.error) throw upload.error;

  const imageUrl = supabase.storage.from("baby-images").getPublicUrl(filePath).data.publicUrl;

  // Optional table: consensus_babies. If it doesn't exist, ignore insert failure.
  try {
    await supabase.from("consensus_babies").insert({
      image_url: imageUrl,
      prediction_count: predictionCount
    });
  } catch (_) {}

  return imageUrl;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!isAuthed(req)) return res.status(401).json({ error: "Unauthorized" });

  try {
    const { data, error } = await supabase
      .from("guest_predictions")
      .select("image_url")
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) throw error;

    const urls = (data || []).map(row => row.image_url).filter(Boolean);
    if (urls.length < 2) {
      return res.status(400).json({ error: "Need at least 2 baby images to generate a consensus." });
    }

    const files = [];
    for (let i = 0; i < Math.min(urls.length, 12); i++) {
      files.push(await imageUrlToFile(urls[i], i));
    }

    const prompt = `
Create one hyper-realistic consensus baby portrait from these guest-generated baby predictions.

The supplied images are different AI baby predictions for the same two parents. Create a new single baby portrait that represents the visual consensus across them.

Requirements:
- hyper-realistic baby portrait
- soft studio photography look
- warm pastel baby shower background
- centered shoulders-up portrait
- preserve common features across the predictions
- do not make a collage
- do not include text, watermark, or multiple babies
- avoid cartoon, sketch, illustration, uncanny face, distorted features
`.trim();

    const result = await client.images.edit({
      model: "gpt-image-1",
      image: files,
      prompt,
      size: "1024x1024",
      quality: "high"
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: "Consensus generation returned no image." });

    const imageUrl = await uploadConsensusImage(b64, urls.length);

    return res.status(200).json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      imageUrl,
      predictionCount: urls.length
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Failed to generate consensus baby." });
  }
}
