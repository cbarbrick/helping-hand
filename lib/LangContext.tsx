"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Lang, translate } from "./i18n";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const LangCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (k) => k });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const url = new URLSearchParams(window.location.search).get("lang");
      const saved = window.localStorage.getItem("hh_lang");
      const pick = (url || saved) as Lang | null;
      if (pick && ["en", "es", "ht"].includes(pick)) setLangState(pick);
    } catch {}
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("hh_lang", l);
    } catch {}
  };

  return (
    <LangCtx.Provider value={{ lang, setLang, t: (k, v) => translate(lang, k, v) }}>
      {children}
    </LangCtx.Provider>
  );
}

export const useLang = () => useContext(LangCtx);
