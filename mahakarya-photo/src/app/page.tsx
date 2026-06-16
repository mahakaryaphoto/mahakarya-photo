"use client";
import { useEffect, useRef, useState, CSSProperties } from "react";
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

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at 50% -10%, #34272b 0%, #16100f 70%)",
    color: "#f5efe8",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "28px 16px 40px",
    gap: 18,
  },
  title: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 38,
    fontWeight: 700,
    letterSpacing: 1,
    margin: 0,
    color: "#e7c79a",
    textAlign: "center",
  },
  subtitle: {
    margin: 0,
    fontSize: 12,
    letterSpacing: 4,
    textTransform: "uppercase",
    color: "#b9aa9d",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 24,
    padding: 14,
    boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    maxWidth: 520,
    width: "100%",
  },
  media: { borderRadius: 16, maxHeight: "48vh", maxWidth: "100%", display: "block" },
  pickLabel: {
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#b9aa9d",
    alignSelf: "flex-start",
  },
  thumbRow: { display: "flex", gap: 10, overflowX: "auto", maxWidth: 520, width: "100%", paddingBottom: 6 },
  button: {
    padding: "16px 44px",
    fontSize: 18,
    fontWeight: 700,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg,#e7c79a,#c79a5e)",
    color: "#2a1d10",
    boxShadow: "0 8px 24px rgba(199,154,94,0.4)",
    letterSpacing: 0.5,
  },
  status: { color: "#d8c9bb", fontSize: 15 },
  error: { color: "#ff9b8a", fontSize: 14, maxWidth: 520, textAlign: "center" },
  qrCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    color: "#2a2024",
  },
  qrLabel: { fontSize: 13, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 },
};

function thumb(active: boolean): CSSProperties {
  return {
    height: 64,
    width: 64,
    objectFit: "cover",
    borderRadius: 12,
    cursor: "pointer",
    flex: "0 0 auto",
    transform: active ? "scale(1.06)" : "scale(1)",
    outline: active ? "3px solid #e7c79a" : "3px solid transparent",
    outlineOffset: 1,
    transition: "transform .15s",
  };
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

  return (
    <main style={styles.page}>
      <div style={{ textAlign: "center" }}>
        <h1 style={styles.title}>Mahakarya Photo</h1>
        <p style={styles.subtitle}>Abadikan momen terbaikmu</p>
      </div>

      <div style={styles.card}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          style={{ ...styles.media, display: photo ? "none" : "block" }}
        />
        {photo && <img src={photo} alt="hasil" style={styles.media} />}
      </div>

      {!photo && (
        <>
          <span style={styles.pickLabel}>Pilih Latar</span>
          <div style={styles.thumbRow}>
            {BACKGROUNDS.map((bg) => (
              <NextImage
                key={bg}
                src={bg}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                onClick={() => setSelectedBg(bg)}
                style={thumb(selectedBg === bg)}
              />
            ))}
          </div>
        </>
      )}

      {status && <p style={styles.status}>{status}</p>}
      {error && <p style={styles.error}>Error: {error}</p>}

      {qr && (
        <div style={styles.qrCard}>
          <span style={styles.qrLabel}>Scan untuk unduh</span>
          <img src={qr} alt="QR" style={{ width: 190, height: 190 }} />
        </div>
      )}

      {!photo ? (
        <button onClick={capture} style={styles.button}>Capture</button>
      ) : (
        <button onClick={reset} style={styles.button}>Foto Lagi</button>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </main>
  );
}