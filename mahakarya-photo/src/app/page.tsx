"use client";
import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import QRCode from "qrcode";
import { removeBackground } from "@imgly/background-removal";

const BACKGROUNDS = Array.from({ length: 25 }, (_, i) => `/bg${i + 1}.jpg`);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState(BACKGROUNDS[0]);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
  }, []);

  async function capture() {
    setError(null);
    setQr(null);
    try {
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);

      const frameBlob: Blob = await new Promise((res) =>
        canvas.toBlob((b) => res(b!), "image/png")
      );

      setStatus("Menggunting orang dari latar…");
      const cutoutBlob = await removeBackground(frameBlob);
      const cutoutImg = await loadImage(URL.createObjectURL(cutoutBlob));

      setStatus("Menempel ke background…");
      const bgImg = await loadImage(selectedBg);
      const comp = document.createElement("canvas");
      comp.width = canvas.width;
      comp.height = canvas.height;
      const ctx = comp.getContext("2d")!;
      const scale = Math.max(comp.width / bgImg.width, comp.height / bgImg.height);
      const bw = bgImg.width * scale, bh = bgImg.height * scale;
      ctx.drawImage(bgImg, (comp.width - bw) / 2, (comp.height - bh) / 2, bw, bh);
      ctx.drawImage(cutoutImg, 0, 0, comp.width, comp.height);

      const finalUrl = comp.toDataURL("image/png");
      setPhoto(finalUrl);

      setStatus("Menyimpan & membuat QR…");
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: finalUrl }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setQr(await QRCode.toDataURL(json.url));
      setStatus(null);
    } catch (e: any) {
      setError(e.message || String(e));
      setStatus(null);
    }
  }

  function reset() {
    setPhoto(null);
    setQr(null);
    setError(null);
    setStatus(null);
  }

  const tombol = {
    padding: "14px 28px",
    fontSize: 18,
    borderRadius: 999,
    border: "none",
    background: "white",
    cursor: "pointer",
  };

  return (
    <main style={{ minHeight: "100vh", background: "black", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16 }}>
      <video ref={videoRef} autoPlay playsInline style={{ maxHeight: "55vh", maxWidth: "100%", display: photo ? "none" : "block" }} />
      {photo && <img src={photo} alt="hasil" style={{ maxHeight: "55vh", maxWidth: "100%" }} />}

      {!photo && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", maxWidth: "100%", padding: 8 }}>
          {BACKGROUNDS.map((bg) => (
            <NextImage
              key={bg}
              src={bg}
              alt=""
              width={64}
              height={64}
              loading="lazy"
              onClick={() => setSelectedBg(bg)}
              style={{
                height: 64, width: 64, objectFit: "cover", borderRadius: 8,
                cursor: "pointer", flex: "0 0 auto",
                border: selectedBg === bg ? "3px solid #4f9cff" : "3px solid transparent",
              }}
            />
          ))}
        </div>
      )}

      {status && <p>{status}</p>}
      {error && <p style={{ color: "salmon" }}>Error: {error}</p>}
      {qr && (
        <div style={{ textAlign: "center" }}>
          <p>Scan untuk download:</p>
          <img src={qr} alt="QR" style={{ width: 200, height: 200, background: "white", padding: 8, borderRadius: 8 }} />
        </div>
      )}

      {!photo ? (
        <button onClick={capture} style={tombol}>Capture</button>
      ) : (
        <button onClick={reset} style={tombol}>Foto Lagi</button>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </main>
  );
}