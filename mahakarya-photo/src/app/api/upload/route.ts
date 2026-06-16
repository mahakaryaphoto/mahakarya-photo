import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    const base64 = image.split(",")[1];
    const buffer = Buffer.from(base64, "base64");

    const path = `foto-${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from("hasil")
      .upload(path, buffer, { contentType: "image/jpeg" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data } = supabase.storage.from("hasil").getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}