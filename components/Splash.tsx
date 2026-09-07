"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WELCOME } from "@/lib/languages";
import Logo from "./Logo";

const INTERVAL = 4200;
// Front page alternates between English and Spanish only.
const SLIDES = WELCOME.filter((w) => w.code === "en" || w.code === "es");

export default function Splash() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI((x) => (x + 1) % SLIDES.length);
        setVisible(true);
      }, 600);
    }, INTERVAL);
    return () => clearInterval(id);
  }, []);

  const w = SLIDES[i];
  const go = () => router.push("/language");

  return (
    <main className="splash" onClick={go} onKeyDown={(e) => e.key === "Enter" && go()} role="button" tabIndex={0}>
      <div className="splash-inner">
        <div className="splash-logo"><Logo size={150} full /></div>
        <div className="splash-brand">Helping Hand</div>
        <div className={`splash-fade ${visible ? "in" : ""}`} dir={w.code === "ar" ? "rtl" : "ltr"}>
          <h1>{w.tagline}</h1>
          {w.items ? (
            <ul className="splash-list">
              {w.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
          ) : (
            <p>{w.what}</p>
          )}
          <div className="splash-tap">{w.tap}</div>
        </div>
        <div className="splash-dots" aria-hidden>
          {SLIDES.map((x, k) => (
            <span key={x.code} className={k === i ? "on" : ""} />
          ))}
        </div>
      </div>
    </main>
  );
}
