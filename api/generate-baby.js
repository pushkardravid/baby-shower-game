import OpenAI from "openai";
import { toFile } from "openai/uploads";
import fs from "fs";
import path from "path";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function clean(value, fallback = "") {
  return String(value || fallback).replace(/[^\w\s%/'.,:;?!()&+-]/g, "").slice(0, 800);
}

function buildPrompt(body) {
  const momPercent = Math.max(0, Math.min(100, Number(body.momPercent ?? 50)));
  const dadPercent = 100 - momPercent;

  return `
Create one hyper-realistic, adorable baby ${clean(body.gender, "baby")} portrait for a baby shower prediction game.

IMPORTANT REFERENCE INSTRUCTIONS:
- Two parent photos are provided as image inputs: the first image is the mother, the second image is the father.
- Use both parent images as strong visual references.
- The baby should plausibly appear to be their biological child, not like a random stock baby.
- Preserve skin tone tendencies, facial proportions, eye shape, smile characteristics, hair characteristics, and overall family resemblance.
- Translate adult features into an age-appropriate baby face.

Guest-selected traits:
- Eyes inspired by: ${clean(body.eyes, "both parents")}
- Smile inspired by: ${clean(body.smile, "both parents")}
- Overall resemblance target: ${momPercent}% mother and ${dadPercent}% father
- Extra context: ${clean(body.customPrompt, "No extra request.")}

Visual style:
- hyper-realistic baby portrait
- premium soft studio photography look
- cute, warm, polished, high-detail
- natural baby skin texture, soft cheeks, expressive eyes
- pastel baby-shower background
- centered shoulders-up portrait
- soft warm lighting
- no text, no watermark, no extra people
- avoid sketch, drawing, cartoon, comic, flat illustration, painterly style, AI-looking skin, distorted features, uncanny face
`.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is not configured in Vercel environment variables." });
  }

  try {
    const momPath = path.join(process.cwd(), "assets", "mom.jpg");
    const dadPath = path.join(process.cwd(), "assets", "dad.jpg");

    const momFile = await toFile(fs.createReadStream(momPath), "mother-reference.jpg", { type: "image/jpeg" });
    const dadFile = await toFile(fs.createReadStream(dadPath), "father-reference.jpg", { type: "image/jpeg" });

    const prompt = buildPrompt(req.body || {});

    const result = await client.images.edit({
      model: "gpt-image-1",
      image: [momFile, dadFile],
      prompt,
      size: "1024x1024",
      quality: "high"
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return res.status(500).json({ error: "Image generation returned no image." });

    return res.status(200).json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      promptUsed: prompt,
      referencesUsed: ["mother-reference.jpg", "father-reference.jpg"]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || "Failed to generate AI baby image." });
  }
}
