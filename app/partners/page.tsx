"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { AREAS } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

const ORG_TYPES = ["government", "nonprofit", "hospital", "dental", "business", "foundation", "faith", "individual", "other"];
const OFFERS: { key: string; icon: string }[] = [
  { key: "kiosk_site", icon: "📍" },
  { key: "kiosk_funding", icon: "🖥️" },
  { key: "warehouse", icon: "🏭" },
  { key: "vehicles", icon: "🚐" },
  { key: "drivers", icon: "🧑‍✈️" },
  { key: "food", icon: "🥫" },
  { key: "clothes", icon: "👕" },
  { key: "hygiene", icon: "🧼" },
  { key: "phones", icon: "📱" },
  { key: "dental", icon: "🦷" },
  { key: "medical", icon: "🩺" },
  { key: "mental_health", icon: "💚" },
  { key: "id_documents", icon: "🪪" },
  { key: "benefits_navigation", icon: "💳" },
  { key: "housing_units", icon: "🏠" },
  { key: "jobs", icon: "💼" },
  { key: "funding", icon: "💰" },
  { key: "volunteers", icon: "🤝" },
];

export default function PartnersPage() {
  const { t } = useLang();
  const [f, setF] = useState({
    org_name: "",
    org_type: "nonprofit",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    offers: [] as string[],
    amount: "",
    area: "",
    message: "",
  });
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const toggle = (k: string) => set({ offers: f.offers.includes(k) ? f.offers.filter((x) => x !== k) : [...f.offers, k] });

  async function submit() {
    setBusy(true);
    setErr(null);
    const { error } = await supabase().from("partner_offers").insert({ ...f, area: f.area || null, amount: f.amount || null });
    if (error) setErr(error.message);
    else setSent(true);
    setBusy(false);
  }

  if (sent)
    return (
      <main className="container">
        <h1>{t("partnerThanks")}</h1>
        <p>{t("partnerThanksBody")}</p>
        <Link className="btn" href="/home">
          {t("home")}
        </Link>
      </main>
    );

  return (
    <main className="container">
      <h1>{t("partnerTitle")}</h1>

      <div className="card soft">
        <h3>{t("partnerWhatWeNeed")}</h3>
        <p className="small" style={{ margin: 0 }}>{t("partnerWhatWeNeedBody")}</p>
      </div>

      <div className="card">
        <label className="field">{t("orgName")}</label>
        <input type="text" autoComplete="organization" value={f.org_name} onChange={(e) => set({ org_name: e.target.value })} />
        <label className="field">{t("orgType")}</label>
        <div className="chips">
          {ORG_TYPES.map((x) => (
            <button key={x} className={f.org_type === x ? "selected" : ""} onClick={() => set({ org_type: x })}>
              {t(`org_${x}`)}
            </button>
          ))}
        </div>
        <label className="field">{t("canOffer")}</label>
        <div className="chips">
          {OFFERS.map((o) => (
            <button key={o.key} className={f.offers.includes(o.key) ? "selected" : ""} onClick={() => toggle(o.key)}>
              <span className="icon">{o.icon}</span>
              {t(`offer_${o.key}`)}
            </button>
          ))}
        </div>
        <label className="field">
          {t("amountOrScale")} <span className="muted small">({t("optional")})</span>
        </label>
        <input type="text" placeholder={t("amountHint")} value={f.amount} onChange={(e) => set({ amount: e.target.value })} />
        <label className="field">{t("myArea")}</label>
        <select value={f.area} onChange={(e) => set({ area: e.target.value })}>
          <option value="">—</option>
          {AREAS.map((x) => (
            <option key={x}>{x}</option>
          ))}
          <option>All of Miami-Dade</option>
        </select>
        <label className="field">{t("contactName")}</label>
        <input type="text" autoComplete="name" value={f.contact_name} onChange={(e) => set({ contact_name: e.target.value })} />
        <label className="field">{t("contactEmail")}</label>
        <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={f.contact_email} onChange={(e) => set({ contact_email: e.target.value })} />
        <label className="field">{t("contactPhone")}</label>
        <input type="tel" inputMode="tel" autoComplete="tel" value={f.contact_phone} onChange={(e) => set({ contact_phone: e.target.value })} />
        <label className="field">{t("message")}</label>
        <textarea value={f.message} onChange={(e) => set({ message: e.target.value })} />
        {err && (
          <div className="errorbox" role="alert">
            <strong>{t("errGeneric")}</strong>
            <p className="small" style={{ margin: 0 }}>{t("errHelp")}</p>
          </div>
        )}
        <button className="btn block lg" style={{ marginTop: 16 }} onClick={submit} disabled={busy || !f.org_name || (!f.contact_email && !f.contact_phone) || f.offers.length === 0}>
          {busy ? t("saving") : t("sendOffer")}
        </button>
      </div>
      <p className="small muted">
        <Link href="/donate" style={{ textDecoration: "underline" }}>
          {t("individualDonate")}
        </Link>
      </p>
    </main>
  );
}
