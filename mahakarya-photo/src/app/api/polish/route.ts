import OpenAI, { toFile } from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Kalau nanti error "model not found", ganti ke "gpt-image-1"
const MODEL = "gpt-image-1.5";

export async function POST(req: Request) {
  try {
    const { image, mask, size } = await req.json();
    const imgBuf = Buffer.from(image.split(",")[1], "base64");
    const maskBuf = Buffer.from(mask.split(",")[1], "base64");

    const result = await openai.images.edit({
      model: MODEL,
      image: await toFile(imgBuf, "image.png", { type: "image/png" }),
      mask: await toFile(maskBuf, "mask.png", { type: "image/png" }),
      prompt:
        "Sesuaikan pencahayaan, bayangan, dan suhu warna LATAR agar menyatu " +
        "natural dengan orang di depannya. Jangan ubah orang, wajah, atau bentuk tubuh. " +
        "Hasil fotorealistik.",
      size: size,            // "1024x1536" (potret) atau "1536x1024" (lanskap)
      quality: "medium",     // hemat biaya
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) throw new Error("AI tidak mengembalikan gambar");
    return NextResponse.json({ image: `data:image/png;base64,${b64}` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}