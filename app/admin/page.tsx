"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import TrustReport from "@/components/TrustReport";
import { PageSkeleton } from "@/components/Skeleton";

type Offer = {
  id: string;
  org_name: string;
  org_type: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  offers: string[];
  amount: string | null;
  area: string | null;
  message: string | null;
  status: string;
  created_at: string;
};
type Donation = { id: string; kind: string; name: string | null; contact: string | null; items: string | null; amount: string | null; message: string | null; created_at: string };
type Counts = { intakes: number; open: number; jobs: number; helpers: number; pickups: number };

export default function AdminPage() {
  const { t } = useLang();
  const { user, profile, loading } = useSession();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [donateUrl, setDonateUrl] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    const sb = supabase();
    const [o, d, i1, i2, j, h, p, s] = await Promise.all([
      sb.from("partner_offers").select("*").order("created_at", { ascending: false }),
      sb.from("donations").select("*").order("created_at", { ascending: false }),
      sb.from("intakes").select("id", { count: "exact", head: true }),
      sb.from("intakes").select("id", { count: "exact", head: true }).eq("status", "open"),
      sb.from("jobs").select("id", { count: "exact", head: true }).eq("active", true),
      sb.from("public_helpers").select("id", { count: "exact", head: true }),
      sb.from("supply_requests").select("id", { count: "exact", head: true }),
      sb.from("settings").select("key,value").eq("key", "donate_url").maybeSingle(),
    ]);
    setOffers((o.data as Offer[]) ?? []);
    setDonations((d.data as Donation[]) ?? []);
    setCounts({ intakes: i1.count ?? 0, open: i2.count ?? 0, jobs: j.count ?? 0, helpers: h.count ?? 0, pickups: p.count ?? 0 });
    setDonateUrl(s.data?.value ?? "");
  }

  useEffect(() => {
    if (profile?.role === "admin") load();
  }, [profile]);

  async function setStatus(id: string, status: string) {
    await supabase().from("partner_offers").update({ status }).eq("id", id);
    load();
  }
  async function saveUrl() {
    await supabase().from("settings").upsert({ key: "donate_url", value: donateUrl });
    setSaved(true);
  }

  if (loading) return <PageSkeleton cards={2} wide />;
  if (!user || profile?.role !== "admin")
    return (
      <main className="container">
        <h1>Admin</h1>
        <p className="muted">Admins only. Set your role to admin in the Supabase profiles table.</p>
        <Link className="btn" href="/account">
          {t("signIn")}
        </Link>
      </main>
    );

  return (
    <main className="container wide">
      <h1>Admin</h1>
      {counts && (
        <div className="row" style={{ marginBottom: 14 }}>
          <span className="tag">{counts.intakes} cases</span>
          <span className="tag warm">{counts.open} open</span>
          <span className="tag">{counts.helpers} helpers</span>
          <span className="tag">{counts.jobs} jobs</span>
          <span className="tag">{counts.pickups} pickups</span>
        </div>
      )}
      <TrustReport />

      <div className="card">
        <label className="field">Online donation link (Stripe, PayPal, GoFundMe...)</label>
        <input type="text" value={donateUrl} placeholder="https://..." onChange={(e) => setDonateUrl(e.target.value)} />
        <button className="btn" style={{ marginTop: 10 }} onClick={saveUrl}>
          {t("save")}
        </button>
        {saved && <span className="success" style={{ marginLeft: 10 }}>{t("saved")}</span>}
      </div>

      <h2>Partner offers ({offers.length})</h2>
      {offers.length === 0 && <div className="card">None yet.</div>}
      {offers.map((o) => (
        <div className="card" key={o.id}>
          <div className="row between">
            <h3>
              {o.org_name} <span className="tag gray">{t(`org_${o.org_type}`)}</span>
            </h3>
            <span className={`tag ${o.status === "new" ? "warm" : ""}`}>{o.status}</span>
          </div>
          <div className="hint">
            {o.contact_name} · {o.contact_email} · {o.contact_phone} · {o.area} · {new Date(o.created_at).toLocaleDateString()}
          </div>
          <div>
            {o.offers.map((x) => (
              <span className="tag" key={x}>
                {t(`offer_${x}`)}
              </span>
            ))}
          </div>
          {o.amount && <p className="small" style={{ marginTop: 6 }}><strong>{o.amount}</strong></p>}
          {o.message && <p className="small">{o.message}</p>}
          <div className="row">
            {["contacted", "active", "declined"].map((s) => (
              <button key={s} className="btn secondary small" onClick={() => setStatus(o.id, s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}

      <h2>Donations ({donations.length})</h2>
      {donations.length === 0 && <div className="card">None yet.</div>}
      {donations.map((d) => (
        <div className="card" key={d.id}>
          <div className="row between">
            <h3>
              {d.kind === "money" ? "💚" : d.kind === "items" ? "📦" : "🤝"} {d.name ?? "—"}
            </h3>
            <span className="hint">{new Date(d.created_at).toLocaleDateString()}</span>
          </div>
          <div className="hint">{d.contact}</div>
          {d.amount && <p className="small"><strong>{d.amount}</strong></p>}
          {d.items && <p className="small">{d.items}</p>}
          {d.message && <p className="small">{d.message}</p>}
        </div>
      ))}
    </main>
  );
}
