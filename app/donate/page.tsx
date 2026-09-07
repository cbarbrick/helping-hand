"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { supabase } from "@/lib/supabase";

type Warehouse = { id: string; name: string; address: string | null };

export default function DonatePage() {
  const { t } = useLang();
  const [donateUrl, setDonateUrl] = useState<string>("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [kind, setKind] = useState<"items" | "time" | "money" | null>(null);
  const [f, setF] = useState({ name: "", contact: "", items: "", dropoff_warehouse: "", amount: "", message: "" });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(false);
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });

  useEffect(() => {
    supabase().from("settings").select("key,value").then(({ data }) => {
      const row = (data ?? []).find((r: { key: string; value: string | null }) => r.key === "donate_url");
      if (row?.value) setDonateUrl(row.value);
    });
    supabase().from("warehouses").select("id,name,address").then(({ data }) => setWarehouses((data as Warehouse[]) ?? []));
  }, []);

  async function submit() {
    if (!kind) return;
    setBusy(true);
    setErr(false);
    const { error } = await supabase().from("donations").insert({
      kind,
      name: f.name || null,
      contact: f.contact || null,
      items: f.items || null,
      dropoff_warehouse: f.dropoff_warehouse || null,
      amount: f.amount || null,
      message: f.message || null,
    });
    setBusy(false);
    if (error) setErr(true);
    else setSent(true);
  }

  const ErrorBox = () =>
    err ? (
      <div className="errorbox" role="alert">
        <strong>{t("errGeneric")}</strong>
        <p className="small" style={{ margin: 0 }}>{t("errHelp")}</p>
      </div>
    ) : null;

  if (sent)
    return (
      <main className="container">
        <h1>{t("donateThanks")}</h1>
        <p>{t("donateThanksBody")}</p>
        <Link className="btn" href="/home">
          {t("home")}
        </Link>
      </main>
    );

  return (
    <main className="container">
      <h1>{t("donateTitle")}</h1>

      <div className="bigchoice">
        <button className={kind === "money" ? "primary" : ""} onClick={() => setKind("money")}>
          <div className="icon">💚</div>
          <div className="title">{t("giveMoney")}</div>
          <div className="sub">{t("giveMoneySub")}</div>
        </button>
        <button className={kind === "items" ? "primary" : ""} onClick={() => setKind("items")}>
          <div className="icon">📦</div>
          <div className="title">{t("giveItems")}</div>
          <div className="sub">{t("giveItemsSub")}</div>
        </button>
        <button className={kind === "time" ? "primary" : ""} onClick={() => setKind("time")}>
          <div className="icon">🤝</div>
          <div className="title">{t("giveTime")}</div>
          <div className="sub">{t("giveTimeSub")}</div>
        </button>
      </div>

      {kind === "money" && (
        <div className="card">
          {donateUrl ? (
            <a className="btn block lg" href={donateUrl} target="_blank" rel="noreferrer">
              💚 {t("giveMoney")}
            </a>
          ) : (
            <p className="small muted">{t("donateSoon")}</p>
          )}
          <label className="field">{t("pledgeAmount")}</label>
          <input type="text" placeholder="$25 / month" value={f.amount} onChange={(e) => set({ amount: e.target.value })} />
          <label className="field">{t("yourName")}</label>
          <input type="text" autoComplete="name" value={f.name} onChange={(e) => set({ name: e.target.value })} />
          <label className="field">{t("contactEmail")}</label>
          <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={f.contact} onChange={(e) => set({ contact: e.target.value })} />
          <p className="note">🔒 {t("privacyNote")}</p>
          <ErrorBox />
          <button className="btn block lg" style={{ marginTop: 16 }} onClick={submit} disabled={busy || !f.contact}>
            {busy ? t("saving") : t("sendPledge")}
          </button>
        </div>
      )}

      {kind === "items" && (
        <div className="card">
          <p className="small">{t("itemsWanted")}</p>
          <label className="field">{t("whatBringing")}</label>
          <textarea value={f.items} onChange={(e) => set({ items: e.target.value })} />
          <label className="field">{t("dropoff")}</label>
          <select value={f.dropoff_warehouse} onChange={(e) => set({ dropoff_warehouse: e.target.value })}>
            <option value="">—</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} {w.address ? `· ${w.address}` : ""}
              </option>
            ))}
          </select>
          <label className="field">{t("yourName")}</label>
          <input type="text" autoComplete="name" value={f.name} onChange={(e) => set({ name: e.target.value })} />
          <label className="field">{t("yourContact")}</label>
          <input type="text" inputMode="tel" autoComplete="tel" value={f.contact} onChange={(e) => set({ contact: e.target.value })} />
          <p className="note">🔒 {t("privacyNote")}</p>
          <ErrorBox />
          <button className="btn block lg" style={{ marginTop: 16 }} onClick={submit} disabled={busy || !f.items || !f.contact}>
            {busy ? t("saving") : t("sendPledge")}
          </button>
        </div>
      )}

      {kind === "time" && (
        <div className="card">
          <p className="small">{t("timeBody")}</p>
          <Link className="btn block lg" href="/account">
            🤝 {t("becomeHelper")}
          </Link>
          <Link className="btn secondary block" style={{ marginTop: 10 }} href="/partners">
            {t("partnerTitle")}
          </Link>
        </div>
      )}
    </main>
  );
}
