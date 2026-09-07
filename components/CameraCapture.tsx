"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onCapture: (f: File) => void;
  onClose: () => void;
  t: (k: string) => string;
};

/** Full-screen in-app camera. Falls back to the device file picker if the camera is blocked. */
export default function CameraCapture({ onCapture, onClose, t }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [shot, setShot] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState(false);
  const [canFlip, setCanFlip] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      stop();
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(true);
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          s.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
        const devs = await navigator.mediaDevices.enumerateDevices();
        setCanFlip(devs.filter((d) => d.kind === "videoinput").length > 1);
      } catch {
        setError(true);
      }
    }
    function stop() {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (!shot) start();
    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, shot]);

  const take = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (facing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    c.toBlob(
      (b) => {
        if (!b) return;
        setBlob(b);
        setShot(URL.createObjectURL(b));
      },
      "image/jpeg",
      0.9
    );
  };

  const use = () => {
    if (!blob) return;
    onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }));
  };

  const retake = () => {
    if (shot) URL.revokeObjectURL(shot);
    setShot(null);
    setBlob(null);
  };

  return (
    <div className="cam">
      <div className="cam-top">
        <button className="cam-x" onClick={onClose} aria-label={t("close")}>✕</button>
        {!shot && !error && canFlip && (
          <button className="cam-flip" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}>
            🔄 {t("flipCamera")}
          </button>
        )}
      </div>

      {error ? (
        <div className="cam-err">
          <p>{t("cameraBlocked")}</p>
          <label className="btn lg block filebtn">
            📁 {t("chooseFile")}
            <input type="file" accept="image/*,application/pdf" capture="environment" onChange={(e) => e.target.files?.[0] && onCapture(e.target.files[0])} />
          </label>
        </div>
      ) : shot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cam-view" src={shot} alt="" />
      ) : (
        <video ref={videoRef} className={`cam-view ${facing === "user" ? "mirror" : ""}`} playsInline muted autoPlay />
      )}

      {!error && (
        <div className="cam-bar">
          {shot ? (
            <>
              <button className="btn ghost lg" onClick={retake}>↺ {t("retake")}</button>
              <button className="btn lg" onClick={use}>✓ {t("usePhoto")}</button>
            </>
          ) : (
            <button className="cam-shutter" onClick={take} aria-label={t("takePhoto")}>
              <span />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
