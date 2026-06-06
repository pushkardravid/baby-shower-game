import OpenAI from "openai";
import { toFile } from "openai/uploads";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb"
    }
  }
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function clean(value, fallback = "") {
  return String(value || fallback)
    .replace(/[^\w\s%/'.,:;?!()&+-]/g, "")
    .slice(0, 600);
}

function buildPrompt(body) {
  const momPercent = Math.max(0, Math.min(100, Number(body.momPercent ?? 50)));
  const dadPercent = 100 - momPercent;

  const gender = clean(body.gender, "girl");
  const eyes = clean(body.eyes, "mother");
  const hair = clean(body.hair, "father");
  const nose = clean(body.nose, "mother");
  const smile = clean(body.smile, "mother");
  const face = clean(body.face, "mother");
  const customPrompt = clean(body.customPrompt, "");

  return `
Create one realistic but adorable baby ${gender} portrait for a baby shower prediction game.

IMPORTANT REFERENCE INSTRUCTIONS:
- Two parent photos are provided as image inputs: the first image is the mother, the second image is the father.
- Use both parent images as strong visual references for facial resemblance, skin tone, hair color, eye shape, nose shape, smile shape, and face structure.
- The baby should feel plausibly inspired by these two parents, not like a random baby.
- Do not copy adult features literally. Translate them into an age-appropriate baby face.

Guest-selected traits:
- Eyes inspired more by the ${eyes}
- Hair inspired more by the ${hair}
- Nose inspired more by the ${nose}
- Smile inspired more by the ${smile}
- Face shape inspired more by the ${face}
- Overall resemblance target: ${momPercent}% mother and ${dadPercent}% father

Visual style:
- realistic baby portrait, soft studio photography look
- cute, warm, polished, high-detail
- natural baby skin texture, soft cheeks, expressive eyes
- pastel baby-shower background
- centered shoulders-up portrait
- soft warm lighting
- no text, no watermark, no extra people
- avoid sketch, drawing, cartoon, comic, flat illustration, painterly style, distorted features, uncanny face

Guest extra request:
${customPrompt || "No extra request."}
`.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: "OPENAI_API_KEY is not configured in Vercel environment variables."
    });
  }

  try {
    const momPath = path.join(process.cwd(), "assets", "mom.jpg");
    const dadPath = path.join(process.cwd(), "assets", "dad.jpg");

    const momFile = await toFile(fs.createReadStream(momPath), "mother-reference.jpg", {
      type: "image/jpeg"
    });

    const dadFile = await toFile(fs.createReadStream(dadPath), "father-reference.jpg", {
      type: "image/jpeg"
    });

    const prompt = buildPrompt(req.body || {});

    const result = await client.images.edit({
      model: "gpt-image-1",
      image: [momFile, dadFile],
      prompt,
      size: "1024x1024",
      quality: "high"
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(500).json({ error: "Image generation returned no image." });
    }

    return res.status(200).json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      promptUsed: prompt,
      referencesUsed: ["mother-reference.jpg", "father-reference.jpg"]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error?.message || "Failed to generate AI baby image."
    });
  }
}
