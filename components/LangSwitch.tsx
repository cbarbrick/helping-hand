"use client";

import { LANGS } from "@/lib/i18n";
import { useLang } from "@/lib/LangContext";

export default function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className="langbar" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.code} className={lang === l.code ? "active" : ""} onClick={() => setLang(l.code)}>
          {compact ? l.code.toUpperCase() : l.label}
        </button>
      ))}
    </div>
  );
}
