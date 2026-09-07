"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LANGUAGES, WELCOME } from "@/lib/languages";
import { useLang } from "@/lib/LangContext";
import Logo from "@/components/Logo";

const OPTIONS = LANGUAGES.filter((l) => l.full);
const ASK = WELCOME.filter((w) => OPTIONS.some((o) => o.code === w.code));

export default function LanguagePage() {
  const router = useRouter();
  const { setLang } = useLang();
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setI((x) => (x + 1) % ASK.length);
        setVisible(true);
      }, 500);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const pick = (code: string) => {
    setLang(code);
    router.push("/home");
  };

  return (
    <main className="container">
      <div className="splash-brand row" style={{ fontSize: 22, marginTop: 6, gap: 10 }}><span className="logo-box"><Logo size={30} /></span> Helping Hand</div>
      <h1 className={`splash-fade ${visible ? "in" : ""}`} style={{ minHeight: 84 }} dir="ltr">
        {ASK[i].askLanguage}
      </h1>
      <div className="langgrid">
        {OPTIONS.map((l) => (
          <button key={l.code} onClick={() => pick(l.code)} dir={l.rtl ? "rtl" : "ltr"}>
            <span className="native">{l.native}</span>
            <span className="english">{l.english}</span>
          </button>
        ))}
      </div>
    </main>
  );
}
