"use client";

import { LANGS } from "@/lib/i18n";
import { useLang } from "@/lib/LangContext";

/**
 * Both labels are always in the markup; CSS picks one. That way a kiosk
 * tablet shows "Kreyòl Ayisyen" while the same screen on a phone shows
 * "HT" instead of wrapping the switcher onto three rows.
 */
export default function LangSwitch({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div className={`langbar${compact ? " compact" : ""}`} role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button key={l.code} className={lang === l.code ? "active" : ""} aria-pressed={lang === l.code} onClick={() => setLang(l.code)}>
          <span className="lang-full">{l.label}</span>
          <span className="lang-code" aria-hidden={!compact}>
            {l.code.toUpperCase()}
          </span>
          <span className="sr-only">{l.label}</span>
        </button>
      ))}
    </div>
  );
}
