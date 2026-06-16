"use client";
import { useEffect, useRef, useState, CSSProperties } from "react";
import NextImage from "next/image";
import QRCode from "qrcode";
import { removeBackground } from "@imgly/background-removal";

const BACKGROUNDS = Array.from({ length: 25 }, (_, i) => `/bg${i + 1}.jpg`);

const SIZES = {
  "30x40": { w: 30, h: 40 },
  "40x60": { w: 40, h: 60 },
} as const;
type SizeKey = keyof typeof SIZES;

const DPI = 150;
const cmToPx = (cm: number) => Math.round((cm / 2.54) * DPI);

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
    padding: "24px 16px 40px",
    gap: 16,
  },
  title: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: 36,
    fontWeight: 700,
    margin: 0,
    color: "#e7c79a",
    textAlign: "center",
  },
  subtitle: { margin: 0, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: "#b9aa9d" },
  card: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 24,
    padding: 12,
    boxShadow: "0 24px 60px rgba(0,0,0,0.55)",
    display: "flex",
    justifyContent: "center",
  },
  mediaWrap: { height: "46vh", maxWidth: "100%", borderRadius: 16, overflow: "hidden", background: "#000" },
  media: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  label: { fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: "#b9aa9d" },
  sizeRow: { display: "flex", gap: 10 },
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
  },
  status: { color: "#d8c9bb", fontSize: 15 },
  error: { color: "#ff9b8a", fontSize: 14, maxWidth: 520, textAlign: "center" },
  qrCard: { background: "#fff", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#2a2024" },
  qrLabel: { fontSize: 13, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 },
};

function sizeBtn(active: boolean): CSSProperties {
  return {
    padding: "10px 18px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 14,
    border: active ? "2px solid #e7c79a" : "2px solid rgba(255,255,255,0.2)",
    background: active ? "rgba(231,199,154,0.18)" : "transparent",
    color: active ? "#e7c79a" : "#d8c9bb",
  };
}

function thumb(active: boolean): CSSProperties {
  return {
    height: 64, width: 64, objectFit: "cover", borderRadius: 12, cursor: "pointer",
    flex: "0 0 auto", transform: active ? "scale(1.06)" : "scale(1)",
    outline: active ? "3px solid #e7c79a" : "3px solid transparent", outlineOffset: 1,
    transition: "transform .15s",
  };
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedBg, setSelectedBg] = useState(BACKGROUNDS[0]);
  const [size, setSize] = useState<SizeKey>("30x40");
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" },
        audio: false,
      })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
  }, []);

  async function capture() {
    setError(null);
    setQr(null);
    try {
      const video = videoRef.current!;
      const dim = SIZES[size];
      const longSide = cmToPx(dim.h);
      const shortSide = cmToPx(dim.w);
      const tw = orientation === "portrait" ? shortSide : longSide;
      const th = orientation === "portrait" ? longSide : shortSide;

      // ambil frame dari webcam
      const frame = document.createElement("canvas");
      frame.width = video.videoWidth;
      frame.height = video.videoHeight;
      frame.getContext("2d")!.drawImage(video, 0, 0);

      // potong tengah ke rasio portrait, lalu skala ke ukuran cetak
      const ratio = tw / th;
      let cw = frame.width, ch = frame.height, cx = 0, cy = 0;
      if (frame.width / frame.height > ratio) {
        cw = Math.round(frame.height * ratio);
        cx = Math.round((frame.width - cw) / 2);
      } else {
        ch = Math.round(frame.width / ratio);
        cy = Math.round((frame.height - ch) / 2);
      }

      const personCanvas = document.createElement("canvas");
      personCanvas.width = tw;
      personCanvas.height = th;
      const pctx = personCanvas.getContext("2d")!;
      pctx.imageSmoothingQuality = "high";
      pctx.drawImage(frame, cx, cy, cw, ch, 0, 0, tw, th);

      const frameBlob: Blob = await new Promise((res) =>
        personCanvas.toBlob((b) => res(b!), "image/png")
      );

      setStatus("Menggunting orang dari latar… (ukuran cetak, agak lama)");
      const cutoutBlob = await removeBackground(frameBlob);
      const cutoutImg = await loadImage(URL.createObjectURL(cutoutBlob));

      setStatus("Menempel ke background…");
      const bgImg = await loadImage(selectedBg);
      const comp = document.createElement("canvas");
      comp.width = tw;
      comp.height = th;
      const ctx = comp.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      const s = Math.max(tw / bgImg.width, th / bgImg.height);
      const bw = bgImg.width * s, bh = bgImg.height * s;
      ctx.drawImage(bgImg, (tw - bw) / 2, (th - bh) / 2, bw, bh);
      ctx.drawImage(cutoutImg, 0, 0, tw, th);

      const finalUrl = comp.toDataURL("image/jpeg", 0.9);
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
        <div style={{ ...styles.mediaWrap, aspectRatio: orientation === "portrait" ? `${SIZES[size].w} / ${SIZES[size].h}` : `${SIZES[size].h} / ${SIZES[size].w}` }}>
          <video ref={videoRef} autoPlay playsInline style={{ ...styles.media, display: photo ? "none" : "block" }} />
          {photo && <img src={photo} alt="hasil" style={styles.media} />}
        </div>
      </div>

      {!photo && (
        <>
          <span style={styles.label}>Ukuran Cetak</span>
          <div style={styles.sizeRow}>
            {(Object.keys(SIZES) as SizeKey[]).map((k) => (
              <button key={k} onClick={() => setSize(k)} style={sizeBtn(size === k)}>
                {k.replace("x", " × ")} cm
              </button>
            ))}
          </div>

          <span style={styles.label}>Orientasi</span>
          <div style={styles.sizeRow}>
            <button onClick={() => setOrientation("portrait")} style={sizeBtn(orientation === "portrait")}>Potret</button>
            <button onClick={() => setOrientation("landscape")} style={sizeBtn(orientation === "landscape")}>Lanskap</button>
          </div>

          <span style={styles.label}>Pilih Latar</span>
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
    </main>
  );
}