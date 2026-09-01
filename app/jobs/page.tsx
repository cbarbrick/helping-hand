"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { AREAS } from "@/lib/i18n";
import { supabase, Job } from "@/lib/supabase";

export default function JobsPage() {
  const { t } = useLang();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [area, setArea] = useState("");
  const [applying, setApplying] = useState<Job | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let q = supabase().from("jobs").select("*").eq("active", true).order("created_at", { ascending: false });
    if (area) q = q.eq("area", area);
    q.then(({ data }) => {
      setJobs((data as Job[]) ?? []);
      setLoaded(true);
    });
  }, [area]);

  async function apply() {
    if (!applying) return;
    setBusy(true);
    const { data: u } = await supabase().auth.getUser();
    const { error } = await supabase().from("job_applications").insert({
      job_id: applying.id,
      applicant_id: u.user?.id ?? null,
      name,
      contact,
      message: message || null,
    });
    if (!error) {
      setSent({ ...sent, [applying.id]: true });
      setApplying(null);
      setName("");
      setContact("");
      setMessage("");
    }
    setBusy(false);
  }

  return (
    <main className="container wide">
      <div className="row between">
        <h1>{t("jobsTitle")}</h1>
        <Link className="btn secondary" href="/jobs/new">
          + {t("postJob")}
        </Link>
      </div>
      <p className="muted">{t("jobsIntro")}</p>
      <select value={area} onChange={(e) => setArea(e.target.value)}>
        <option value="">{t("allAreas")}</option>
        {AREAS.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>

      <div style={{ marginTop: 14 }}>
        {loaded && jobs.length === 0 && <div className="card">{t("noJobs")}</div>}
        {jobs.map((j) => (
          <div className="card" key={j.id}>
            <div className="row between">
              <h3>{j.title}</h3>
              {j.pay && <strong style={{ color: "var(--brand-dark)" }}>{j.pay}</strong>}
            </div>
            <div className="hint">
              {j.company} {j.area ? `· ${j.area}` : ""} · {t(`type_${j.job_type}`)}
            </div>
            <div>
              {j.no_id_ok && <span className="tag">{t("tag_noId")}</span>}
              {j.no_address_ok && <span className="tag">{t("tag_noAddress")}</span>}
              {j.same_day_pay && <span className="tag">{t("tag_sameDay")}</span>}
            </div>
            {j.description && <p className="small" style={{ marginTop: 10 }}>{j.description}</p>}
            {j.requirements && (
              <p className="small muted">
                {t("requirements")}: {j.requirements}
              </p>
            )}
            {j.how_to_apply && <p className="small">{j.how_to_apply}</p>}
            <div className="row" style={{ marginTop: 10 }}>
              {j.contact_phone && (
                <a className="btn secondary" href={`tel:${j.contact_phone.replace(/[^0-9+]/g, "")}`}>
                  📞 {j.contact_phone}
                </a>
              )}
              {sent[j.id] ? (
                <span className="success">{t("applicationSent")}</span>
              ) : (
                <button className="btn" onClick={() => setApplying(j)}>
                  {t("apply")}
                </button>
              )}
            </div>
            {applying?.id === j.id && (
              <div className="card soft" style={{ marginTop: 12, marginBottom: 0 }}>
                <h3>{t("applyTitle", { title: j.title })}</h3>
                <label className="field">{t("yourName")}</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                <label className="field">{t("yourContact")}</label>
                <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} />
                <label className="field">{t("message")}</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn" onClick={apply} disabled={busy || !name || !contact}>
                    {t("sendApplication")}
                  </button>
                  <button className="btn ghost" onClick={() => setApplying(null)}>
                    {t("back")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
