import OpenAI from "openai";
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
  return String(value || fallback).replace(/[^\w\s%/'.,:-]/g, "").slice(0, 120);
}

function buildPrompt(body) {
  const momPercent = Math.max(0, Math.min(100, Number(body.momPercent ?? 50)));
  const dadPercent = 100 - momPercent;
  const gender = clean(body.gender, "girl");

  const eyes = clean(body.eyes, "Mom");
  const hair = clean(body.hair, "Dad");
  const nose = clean(body.nose, "Mom");
  const smile = clean(body.smile, "Mom");
  const face = clean(body.face, "Mom");

  return `
Create a single cute storybook-style baby ${gender} portrait for a baby shower game.

Use the two uploaded parent photos only as visual reference. Do not copy adult features literally. Create a wholesome baby portrait that feels like a plausible child inspired by both parents.

Guest selected traits:
- Eyes inspired by: ${eyes}
- Hair inspired by: ${hair}
- Nose inspired by: ${nose}
- Smile inspired by: ${smile}
- Face shape inspired by: ${face}
- Overall resemblance: ${momPercent}% mother and ${dadPercent}% father

Style:
- warm pastel baby shower illustration
- cute, soft, friendly, polished
- big expressive baby eyes
- gentle cheeks
- clean background
- no text, no watermark, no extra people
- not photorealistic, not creepy, not uncanny
- centered portrait, shoulders up
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
    const prompt = buildPrompt(req.body || {});
    const momPath = path.join(process.cwd(), "assets", "mom.jpg");
    const dadPath = path.join(process.cwd(), "assets", "dad.jpg");

    const result = await client.images.edit({
      model: "gpt-image-1",
      image: [
        fs.createReadStream(momPath),
        fs.createReadStream(dadPath)
      ],
      prompt,
      size: "1024x1024"
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(500).json({ error: "Image generation returned no image." });
    }

    return res.status(200).json({
      imageDataUrl: `data:image/png;base64,${b64}`,
      promptUsed: prompt
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error?.message || "Failed to generate AI baby image."
    });
  }
}
