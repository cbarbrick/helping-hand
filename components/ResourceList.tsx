"use client";

import { Resource } from "@/lib/supabase";
import { useLang } from "@/lib/LangContext";

export function ResourceCard({ r }: { r: Resource }) {
  const { t, lang } = useLang();
  const desc = lang === "es" ? r.description_es || r.description : lang === "ht" ? r.description_ht || r.description : r.description;
  const tel = r.phone?.replace(/[^0-9+]/g, "");
  return (
    <div className="resource">
      <div className="name">{r.name}</div>
      {desc && <p className="small" style={{ margin: "4px 0 0" }}>{desc}</p>}
      {r.hours && <div className="hint">{t("hours")}: {r.hours}</div>}
      {r.address && <div className="hint">📍 {r.address}</div>}
      {r.website && (
        <div className="hint">
          <a href={r.website} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
            {r.website.replace(/^https?:\/\//, "")}
          </a>
        </div>
      )}
      {r.phone && (
        <a className="call" href={`tel:${tel}`}>
          📞 {t("call")} {r.phone}
        </a>
      )}
      {r.script && (
        <div className="script">
          <strong style={{ fontStyle: "normal" }}>{t("whatToSay")}:</strong> {r.script}
        </div>
      )}
    </div>
  );
}
