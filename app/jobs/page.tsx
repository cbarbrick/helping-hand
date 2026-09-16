"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { AREAS } from "@/lib/i18n";
import { supabase, Job } from "@/lib/supabase";
import { Skeleton } from "@/components/Skeleton";

// Work that hires this week and needs no diploma. Matched against the posting's text so employers
// do not have to pick a category when they post.
const CATS: { key: string; icon: string; words: string[] }[] = [
  { key: "kitchen", icon: "🍽️", words: ["dish", "kitchen", "cook", "prep", "restaurant", "porter", "busser", "line"] },
  { key: "construction", icon: "🏗️", words: ["construction", "laborer", "labor", "site", "demolition", "roof", "concrete", "drywall"] },
  { key: "cleaning", icon: "🧹", words: ["clean", "janitor", "custod", "housekeep", "porter", "crew"] },
  { key: "cafeteria", icon: "🥪", words: ["cafeteria", "food service", "school", "hospital", "server", "counter"] },
  { key: "warehouse", icon: "📦", words: ["warehouse", "packer", "pack", "mover", "moving", "loader", "stock", "event", "setup"] },
  { key: "landscaping", icon: "🌿", words: ["landscap", "grounds", "lawn", "yard", "tree"] },
  { key: "hotel", icon: "🛎️", words: ["hotel", "housekeep", "room attendant", "laundry", "valet"] },
];
const jobText = (j: Job) => [j.title, j.company, j.description, j.requirements, j.how_to_apply].filter(Boolean).join(" ").toLowerCase();
const noExperience = (j: Job) => !j.requirements || /no experience|will train|no diploma|entry|no schooling|training provided/i.test(j.requirements);
const thisWeek = (j: Job) => ["day_labor", "gig", "temp"].includes(j.job_type) || j.same_day_pay || /this week|today|tomorrow|immediately|urgent|start now|asap/i.test(jobText(j));

export default function JobsPage() {
  const { t } = useLang();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [area, setArea] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [applying, setApplying] = useState<Job | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState(false);

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
    setErr(false);
    const { data: u } = await supabase().auth.getUser();
    const { error } = await supabase().from("job_applications").insert({
      job_id: applying.id,
      applicant_id: u.user?.id ?? null,
      name,
      contact,
      message: message || null,
    });
    if (error) setErr(true);
    else {
      setSent({ ...sent, [applying.id]: true });
      setApplying(null);
      setName("");
      setContact("");
      setMessage("");
    }
    setBusy(false);
  }

  const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = jobs.filter((j) => {
    const text = jobText(j);
    if (words.length && !words.every((w) => text.includes(w))) return false;
    if (cat === "week") return thisWeek(j);
    if (cat) {
      const c = CATS.find((x) => x.key === cat);
      return !!c && c.words.some((w) => text.includes(w));
    }
    return true;
  });

  return (
    <main className="container">
      <div className="row between">
        <h1>{t("jobsTitle")}</h1>
        <Link className="btn secondary" href="/jobs/new">
          + {t("postJob")}
        </Link>
      </div>
      <p className="muted">{t("jobsIntro")}</p>
      <label className="sr-only" htmlFor="job-q">{t("jobsSearch")}</label>
      <input id="job-q" type="text" placeholder={t("jobsSearch")} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" style={{ marginTop: 0 }} />
      <div className="chips" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}>
        <button className={cat === "" ? "selected" : ""} onClick={() => setCat("")}>{t("jobsAll")}</button>
        <button className={cat === "week" ? "selected" : ""} onClick={() => setCat("week")}>⚡ {t("jobsThisWeek")}</button>
        {CATS.map((c) => (
          <button key={c.key} className={cat === c.key ? "selected" : ""} onClick={() => setCat(c.key)}>
            {c.icon} {t(`cat_${c.key}`)}
          </button>
        ))}
      </div>
      <label className="field" htmlFor="job-area">{t("areaLabel")}</label>
      <select id="job-area" value={area} onChange={(e) => setArea(e.target.value)}>
        <option value="">{t("allAreas")}</option>
        {AREAS.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>

      <div style={{ marginTop: 24 }}>
        {!loaded && <Skeleton cards={3} heading={false} />}
        {loaded && jobs.length === 0 && <div className="card">{t("noJobs")}</div>}
        {loaded && jobs.length > 0 && shown.length === 0 && <div className="card">{t("jobsNone")}</div>}
        {shown.map((j) => (
          <div className="card" key={j.id}>
            <div className="row between">
              <h3>{j.title}</h3>
              {j.pay && <strong style={{ color: "var(--brand-dark)" }}>{j.pay}</strong>}
            </div>
            <div className="hint">
              {j.company} {j.area ? `· ${j.area}` : ""} · {t(`type_${j.job_type}`)}
            </div>
            <div>
              {thisWeek(j) && <span className="tag warm">⚡ {t("tag_thisWeek")}</span>}
              {noExperience(j) && <span className="tag">{t("tag_noExp")}</span>}
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
                <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                <label className="field">{t("yourContact")}</label>
                <input type="text" inputMode="tel" autoComplete="tel" value={contact} onChange={(e) => setContact(e.target.value)} />
                <label className="field">{t("message")}</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
                <p className="note"><span aria-hidden="true">🔒</span><span>{t("privacyNote")}</span></p>
                {err && (
                  <div className="errorbox" role="alert">
                    <strong>{t("errGeneric")}</strong>
                    <p className="small" style={{ margin: 0 }}>{t("errHelp")}</p>
                  </div>
                )}
                <div className="row" style={{ marginTop: 12 }}>
                  <button className="btn" onClick={apply} disabled={busy || !name || !contact}>
                    {busy ? t("saving") : t("sendApplication")}
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
