import OpenAI from "openai";
import { toFile } from "openai/uploads";
import fs from "fs";
import path from "path";

export const config = {
  api: { bodyParser: { sizeLimit: "4mb" } }
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

  return `
Create a single cute storybook-style baby ${clean(body.gender, "girl")} portrait for a baby shower game.

Use the two uploaded parent photos only as visual reference. Do not copy adult features literally.

Guest selected traits:
- Eyes inspired by: ${clean(body.eyes, "mother")}
- Hair inspired by: ${clean(body.hair, "father")}
- Nose inspired by: ${clean(body.nose, "mother")}
- Smile inspired by: ${clean(body.smile, "mother")}
- Face shape inspired by: ${clean(body.face, "mother")}
- Overall resemblance: ${momPercent}% mother and ${dadPercent}% father

Style:
warm pastel baby shower illustration, cute, soft, friendly, polished, big expressive baby eyes, gentle cheeks, clean background, no text, no watermark, no extra people, not photorealistic, not creepy, centered portrait, shoulders up.
`.trim();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const momPath = path.join(process.cwd(), "assets", "mom.jpg");
    const dadPath = path.join(process.cwd(), "assets", "dad.jpg");

    const momFile = await toFile(fs.createReadStream(momPath), "mom.jpg", {
      type: "image/jpeg"
    });

    const dadFile = await toFile(fs.createReadStream(dadPath), "dad.jpg", {
      type: "image/jpeg"
    });

    const result = await client.images.edit({
      model: "gpt-image-1",
      image: [momFile, dadFile],
      prompt: buildPrompt(req.body || {}),
      size: "1024x1024"
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(500).json({ error: "Image generation returned no image." });
    }

    return res.status(200).json({
      imageDataUrl: `data:image/png;base64,${b64}`
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: error?.message || "Failed to generate AI baby image."
    });
  }
}
