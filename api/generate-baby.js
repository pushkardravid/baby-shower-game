import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

function clean(value, fallback = "") {
  return String(value || fallback).replace(/[^\w\s%/'.,:;?!()&+-]/g, "").slice(0, 800);
}

function buildPrompt(body) {
  const momPercent = Math.max(0, Math.min(100, Number(body.momPercent ?? 50)));
  const dadPercent = 100 - momPercent;

  const gender = clean(body.gender, "baby");
  const eyes = clean(body.eyes, "both parents");
  const smile = clean(body.smile, "both parents");
  const nose = clean(body.nose, "balanced blend of both parents");
  const hairType = clean(body.hairType, "natural dark baby hair");
  const cheeks = clean(body.cheeks, "soft baby cheeks");
  const expression = clean(body.expression, "sweet natural expression");
  const outfit = clean(body.outfit, "simple cute baby outfit");
  const babyDescription = clean(body.babyDescription, "");
  const customPrompt = clean(body.customPrompt, "");
  const variation = clean(body.variation, "natural candid baby portrait");

  return `
Create one hyper-realistic, adorable baby ${gender} portrait for a baby shower prediction game.

IMPORTANT REFERENCE INSTRUCTIONS:
- Two parent photos are provided as image inputs: the first image is the mother, the second image is the father.
- Use both parent images as strong visual references.
- The baby should plausibly appear to be their biological child, not like a random stock baby.
- Preserve skin tone tendencies, facial proportions, eye shape, smile characteristics, hair characteristics, and overall family resemblance.
- Translate adult features into an age-appropriate baby face.
- Avoid making every output follow the same template. Vary the pose, expression, background, outfit, crop, and lighting based on the guest inputs.

Guest-selected visual traits:
- Eyes inspired by: ${eyes}
- Smile/lips inspired by: ${smile}
- Nose: ${nose}
- Hair: ${hairType}
- Cheeks: ${cheeks}
- Expression: ${expression}
- Outfit / vibe: ${outfit}
- Overall resemblance target: ${momPercent}% mother and ${dadPercent}% father

Guest description of what baby may look like:
${babyDescription || "No detailed visual description provided."}

Guest extra message:
${customPrompt || "No extra request."}

Composition variation:
${variation}

Visual style:
- hyper-realistic baby portrait
- premium photography look, not an illustration
- cute, warm, polished, high-detail
- natural baby skin texture, soft cheeks, expressive eyes
- realistic family resemblance
- single baby only
- no text, no watermark, no extra people
- avoid sketch, drawing, cartoon, comic, flat illustration, painterly style, AI-looking skin, distorted features, uncanny face
`.trim();
}

async function uploadGeneratedImage(b64) {
  if (!supabase || !b64) return null;
  const buffer = Buffer.from(b64, "base64");
  const filePath = `${Date.now()}-${crypto.randomUUID()}.png`;
  const upload = await supabase.storage.from("baby-images").upload(filePath, buffer, {
    contentType: "image/png",
    upsert: false
  });
  if (upload.error) {
    console.error("Supabase image upload failed", upload.error);
    return null;
  }
  return supabase.storage.from("baby-images").getPublicUrl(filePath).data.publicUrl;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!process.env.OPENAI_API_KEY) return res.status(500).json({ error: "OPENAI_API_KEY is not configured." });

  try {
    const momFile = await toFile(fs.createReadStream(path.join(process.cwd(), "assets", "mom.jpg")), "mother-reference.jpg", { type: "image/jpeg" });
    const dadFile = await toFile(fs.createReadStream(path.join(process.cwd(), "assets", "dad.jpg")), "father-reference.jpg", { type: "image/jpeg" });

    const result = await client.images.edit({
      model: "gpt-image-1",
      image: [momFile, dadFile],
      prompt: buildPrompt(req.body || {}),
      size: "1024x1024",
      quality: "high"
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: "Image generation returned no image." });

    const imageUrl = await uploadGeneratedImage(b64);
    return res.status(200).json({ imageDataUrl: `data:image/png;base64,${b64}`, imageUrl });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Failed to generate AI baby image." });
  }
}
