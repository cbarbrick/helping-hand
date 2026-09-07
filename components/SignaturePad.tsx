"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/LangContext";

// Finger / mouse signature. Calls onChange with a PNG data URL (or null when cleared).
export default function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const { t } = useLang();
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = 160;
    c.width = w * dpr;
    c.height = h * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1f3d30";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ref.current!.setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = ref.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (empty) setEmpty(false);
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange(ref.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="sigpad">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up} />
      {empty && <div className="sigpad-hint">✍️ {t("signHere")}</div>}
      <button type="button" className="btn ghost small sigpad-clear" onClick={clear}>
        {t("clearSig")}
      </button>
    </div>
  );
}
