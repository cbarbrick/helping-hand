"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { AREAS } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { PageSkeleton } from "@/components/Skeleton";

const TYPES = ["full_time", "part_time", "day_labor", "gig", "temp"];

export default function NewJob() {
  const { t } = useLang();
  const { user, loading } = useSession();
  const router = useRouter();
  const [f, setF] = useState({
    title: "",
    company: "",
    area: "",
    pay: "",
    job_type: "full_time",
    description: "",
    requirements: "",
    no_id_ok: false,
    no_address_ok: false,
    same_day_pay: false,
    contact_phone: "",
    contact_email: "",
    how_to_apply: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });

  async function publish() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase().from("jobs").insert({ ...f, employer_id: user.id, area: f.area || null });
    if (error) setErr(error.message);
    else router.push("/jobs");
    setBusy(false);
  }

  if (loading) return <PageSkeleton cards={1} />;
  if (!user)
    return (
      <main className="container">
        <Link className="btn ghost small" href="/jobs">← {t("jobs")}</Link>
        <h1>{t("postJob")}</h1>
        <p>{t("signInToPost")}</p>
        <Link className="btn" href="/account">
          {t("signIn")}
        </Link>
      </main>
    );

  return (
    <main className="container">
      <Link className="btn ghost small" href="/jobs">← {t("jobs")}</Link>
      <h1>{t("postJob")}</h1>
      <div className="card">
        <label className="field">{t("jobTitle")}</label>
        <input type="text" value={f.title} onChange={(e) => set({ title: e.target.value })} />
        <label className="field">{t("company")}</label>
        <input type="text" autoComplete="organization" value={f.company} onChange={(e) => set({ company: e.target.value })} />
        <label className="field">{t("myArea")}</label>
        <select value={f.area} onChange={(e) => set({ area: e.target.value })}>
          <option value="">—</option>
          {AREAS.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <label className="field">{t("pay")}</label>
        <input type="text" placeholder="$18/hr" value={f.pay} onChange={(e) => set({ pay: e.target.value })} />
        <label className="field">{t("jobType")}</label>
        <div className="chips">
          {TYPES.map((x) => (
            <button key={x} className={f.job_type === x ? "selected" : ""} onClick={() => set({ job_type: x })}>
              {t(`type_${x}`)}
            </button>
          ))}
        </div>
        <label className="field">{t("description")}</label>
        <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} />
        <label className="field">{t("requirements")}</label>
        <input type="text" value={f.requirements} onChange={(e) => set({ requirements: e.target.value })} />
        <label className="check">
          <input type="checkbox" checked={f.no_id_ok} onChange={(e) => set({ no_id_ok: e.target.checked })} /> {t("tag_noId")}
        </label>
        <label className="check">
          <input type="checkbox" checked={f.no_address_ok} onChange={(e) => set({ no_address_ok: e.target.checked })} /> {t("tag_noAddress")}
        </label>
        <label className="check">
          <input type="checkbox" checked={f.same_day_pay} onChange={(e) => set({ same_day_pay: e.target.checked })} /> {t("tag_sameDay")}
        </label>
        <label className="field">{t("contactPhone")}</label>
        <input type="tel" inputMode="tel" autoComplete="tel" value={f.contact_phone} onChange={(e) => set({ contact_phone: e.target.value })} />
        <label className="field">{t("contactEmail")}</label>
        <input type="email" inputMode="email" autoComplete="email" autoCapitalize="none" value={f.contact_email} onChange={(e) => set({ contact_email: e.target.value })} />
        <label className="field">{t("howToApply")}</label>
        <input type="text" value={f.how_to_apply} onChange={(e) => set({ how_to_apply: e.target.value })} />
        {err && (
          <div className="errorbox" role="alert">
            <strong>{t("errGeneric")}</strong>
            <p className="small" style={{ margin: 0 }}>{err}</p>
          </div>
        )}
        <button className="btn block lg" style={{ marginTop: 16 }} onClick={publish} disabled={busy || !f.title || !f.company}>
          {busy ? t("saving") : t("publish")}
        </button>
      </div>
    </main>
  );
}
