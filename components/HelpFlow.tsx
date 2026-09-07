"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { AREAS, NEEDS, Need } from "@/lib/i18n";
import { supabase, Resource } from "@/lib/supabase";
import { ResourceCard } from "./ResourceList";
import LangSwitch from "./LangSwitch";
import PinLogin from "./PinLogin";
import { useSession } from "@/lib/useSession";

export const NEED_ICONS: Record<string, string> = {
  housing: "🏠",
  id: "🪪",
  ssn: "📄",
  food: "🥫",
  clothes: "👕",
  job: "💼",
  healthcare: "🩺",
  benefits: "💳",
  disability: "♿",
  documents: "📑",
  addiction: "💚",
  phone: "📱",
  family: "👨‍👩‍👧",
  veterans: "🎖️",
  safety: "🛡️",
  general: "☎️",
};

type Tri = boolean | null;
type Answers = {
  household: "single" | "family" | null;
  adults: number;
  children: number;
  childrenAges: string;
  pregnant: Tri;
  senior: Tri;
  registrantName: string;
  registrantRelationship: string;
  name: string;
  hasSleep: Tri;
  area: string;
  landmark: string;
  howLong: string;
  homelessDuration: string;
  pays: Tri;
  payDetails: string;
  inDanger: Tri;
  hasId: Tri;
  hasSsn: Tri;
  hasBirthCert: Tri;
  hasPhone: Tri;
  income: string;
  hasSnap: Tri;
  hasMedicaid: Tri;
  disability: Tri;
  veteran: Tri;
  recovery: Tri;
  kidsInSchool: Tri;
  needsChildcare: Tri;
  needs: Need[];
  contact: string;
  notes: string;
};

const empty: Answers = {
  household: null,
  adults: 1,
  children: 1,
  childrenAges: "",
  pregnant: null,
  senior: null,
  registrantName: "",
  registrantRelationship: "",
  name: "",
  hasSleep: null,
  area: "",
  landmark: "",
  howLong: "",
  homelessDuration: "",
  pays: null,
  payDetails: "",
  inDanger: null,
  hasId: null,
  hasSsn: null,
  hasBirthCert: null,
  hasPhone: null,
  income: "",
  hasSnap: null,
  hasMedicaid: null,
  disability: null,
  veteran: null,
  recovery: null,
  kidsInSchool: null,
  needsChildcare: null,
  needs: [],
  contact: "",
  notes: "",
};

type StepId = "household" | "family" | "registrant" | "name" | "sleep" | "sleepDetails" | "danger" | "documents" | "income" | "health" | "kids" | "needs" | "contact";

export default function HelpFlow() {
  const { t, lang } = useLang();
  const params = useSearchParams();
  const someone = params.get("for") === "someone";
  const kioskCode = params.get("kiosk");
  const s = (key: string) => t(someone ? `${key}Someone` : key);

  const [a, setA] = useState<Answers>(empty);
  const [idx, setIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSession();
  const [claimed, setClaimed] = useState(false);

  const set = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));

  // Steps in the order a case worker asks them: who is here → safety tonight → danger → papers → money → health → kids → needs → contact
  const steps = useMemo<StepId[]>(() => {
    const list: StepId[] = ["household"];
    if (a.household === "family") list.push("family");
    if (someone) list.push("registrant");
    list.push("name", "sleep", "sleepDetails", "danger", "documents", "income", "health");
    if (a.household === "family" && a.children > 0) list.push("kids");
    list.push("needs", "contact");
    return list;
  }, [a.household, a.children, someone]);
  const step = steps[Math.min(idx, steps.length - 1)];
  const total = steps.length;

  const canNext = useMemo(() => {
    switch (step) {
      case "household":
        return a.household !== null;
      case "family":
        return a.adults >= 1 && a.children >= 0;
      case "registrant":
        return a.registrantRelationship !== "";
      case "sleep":
        return a.hasSleep !== null;
      case "sleepDetails":
        return a.area !== "";
      case "documents":
        return a.hasId !== null && a.hasPhone !== null;
      case "needs":
        return a.needs.length > 0;
      default:
        return true;
    }
  }, [step, a]);

  // Pre-select needs from earlier answers when the needs step opens
  function suggestedNeeds(): Need[] {
    const n = new Set<Need>(a.needs);
    if (a.hasSleep === false) n.add("housing");
    if (a.hasId === false) n.add("id");
    if (a.hasSsn === false) n.add("ssn");
    if (a.hasBirthCert === false) n.add("documents");
    if (a.hasPhone === false) n.add("phone");
    if (a.hasSnap === false || a.income === "none") n.add("benefits");
    if (a.hasMedicaid === false) n.add("healthcare");
    if (a.disability === true) n.add("disability");
    if (a.recovery === true) n.add("addiction");
    if (a.income === "none" || a.income === "other") n.add("job");
    return [...n];
  }

  const next = () => {
    if (step === "health" || (step === "kids" && steps[idx + 1] === "needs")) set({ needs: suggestedNeeds() });
    setIdx((x) => Math.min(x + 1, total - 1));
    window.scrollTo({ top: 0 });
  };
  const back = () => setIdx((x) => Math.max(x - 1, 0));

  async function submit() {
    setSaving(true);
    setError(null);
    const needs = [...a.needs];
    const sb = supabase();
    const { data: userData } = await sb.auth.getUser();
    let kioskId: string | null = null;
    if (kioskCode) {
      const { data: k } = await sb.from("kiosks").select("id").eq("code", kioskCode).maybeSingle();
      kioskId = k?.id ?? null;
    }
    const newId = crypto.randomUUID();
    const { error } = await sb.from("intakes").insert({
      id: newId,
      user_id: userData.user?.id ?? null,
      kiosk_id: kioskId,
      on_behalf_of: someone,
      language: lang,
      household_type: a.household ?? "single",
      adults: a.household === "family" ? a.adults : 1,
      children: a.household === "family" ? a.children : 0,
      children_ages: a.childrenAges || null,
      pregnant: a.pregnant,
      senior: a.senior,
      registrant_name: someone ? a.registrantName || null : null,
      registrant_relationship: someone ? a.registrantRelationship || null : null,
      first_name: a.name || null,
      has_place_to_sleep: a.hasSleep,
      sleep_area: a.landmark || null,
      sleep_how_long: a.howLong || null,
      homeless_duration: a.homelessDuration || null,
      pays_rent: a.pays,
      rent_details: a.payDetails || null,
      in_danger: a.inDanger,
      has_id: a.hasId,
      has_ssn: a.hasSsn,
      has_birth_cert: a.hasBirthCert,
      has_phone: a.hasPhone,
      income_source: a.income || null,
      has_snap: a.hasSnap,
      has_medicaid: a.hasMedicaid,
      has_disability: a.disability,
      veteran: a.veteran,
      wants_recovery: a.recovery,
      kids_in_school: a.kidsInSchool,
      needs_childcare: a.needsChildcare,
      contact: a.contact || null,
      area: a.area || null,
      needs,
      notes: a.notes || null,
    });
    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    setIntakeId(newId);
    const extra: string[] = ["general"];
    if (a.household === "family") extra.push("family");
    if (a.veteran) extra.push("veterans");
    if (a.inDanger) extra.push("safety");
    const { data: res } = await sb
      .from("resources")
      .select("*")
      .in("need", [...needs, ...extra])
      .order("priority");
    setResources((res as Resource[]) ?? []);
    setSaving(false);
    setDone(true);
    window.scrollTo({ top: 0 });
  }

  async function claimIntake() {
    const { data: u } = await supabase().auth.getUser();
    if (!u.user || !intakeId) return;
    await supabase().from("intakes").update({ user_id: u.user.id }).eq("id", intakeId);
    setClaimed(true);
  }

  const toggleNeed = (n: Need) => set({ needs: a.needs.includes(n) ? a.needs.filter((x) => x !== n) : [...a.needs, n] });

  const YesNo = ({ value, onChange, skip }: { value: Tri; onChange: (v: Tri) => void; skip?: boolean }) => (
    <div>
      <div className="yesno">
        <button className={value === true ? "selected" : ""} onClick={() => onChange(true)}>
          {t("yes")}
        </button>
        <button className={value === false ? "selected" : ""} onClick={() => onChange(false)}>
          {t("no")}
        </button>
      </div>
      {skip && (
        <button className="btn ghost small" onClick={() => onChange(null)} style={{ marginTop: 4 }}>
          {t("preferNot")}
        </button>
      )}
    </div>
  );

  const Counter = ({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) => (
    <div className="counter">
      <button onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span>{value}</span>
      <button onClick={() => onChange(Math.min(20, value + 1))}>+</button>
    </div>
  );

  if (done) {
    const byNeed = (n: string) => resources.filter((r) => r.need === n);
    const sections: string[] = [];
    if (a.inDanger) sections.push("safety");
    if (a.household === "family") sections.push("family");
    if (a.veteran) sections.push("veterans");
    sections.push(...a.needs);
    const general = byNeed("general");
    return (
      <main className="container">
        <h1>{someone && a.name ? t("planTitleSomeone", { name: a.name }) : t("planTitle")}</h1>
        <p className="muted">{t("planIntro")}</p>
        {intakeId && (
          <div className="card soft">
            <div className="small muted">{t("yourNumber")}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: ".05em" }}>HH-{intakeId.slice(0, 6).toUpperCase()}</div>
            <div className="hint">
              {t("showThis")}
              {a.household === "family" && ` · ${t("familyOf", { n: a.adults + a.children })}`}
            </div>
          </div>
        )}

        {a.hasSleep === false && (
          <div className="card warm">
            <h3>{t("urgentTitle")}</h3>
            <p className="small">{someone ? t("urgentBodySomeone") : t("urgentBody")}</p>
            <p className="success small">{t("outreachRequested")}</p>
          </div>
        )}

        {!someone && !user && !claimed && (
          <div className="card soft">
            <h3>📬 {t("getUpdatesTitle")}</h3>
            <p className="small">{t("getUpdatesBody")}</p>
            <PinLogin compact onDone={claimIntake} />
          </div>
        )}
        {!someone && (user || claimed) && (
          <div className="card soft">
            <strong>📬 {t("updatesOn")}</strong>
            <p className="small muted" style={{ margin: "4px 0 0" }}>{t("updatesOnBody")}</p>
          </div>
        )}

        {a.needs.some((n) => ["id", "ssn", "documents", "benefits", "disability", "healthcare"].includes(n)) && (
          <div className="card soft">
            <h3>🪪 {t("docsTitle")}</h3>
            <p className="small">{t("docsPlanCard")}</p>
            <Link
              className="btn block"
              href={`/documents?intake=${intakeId}&kiosk=${kioskCode ?? "NM-108"}&need=${[a.needs.includes("ssn") ? "ssn_card" : null, a.needs.includes("documents") ? "birth_cert" : null, a.needs.includes("id") ? "fl_id" : null, a.needs.some((n) => ["benefits", "disability", "healthcare"].includes(n)) ? "benefits" : null].filter(Boolean).join(",")}`}
            >
              {t("docsStart")}
            </Link>
          </div>
        )}

        <div className="card">
          <h3>{t("findHelper")}</h3>
          <p className="small muted">{t("findHelperSub")}</p>
          <Link className="btn block" href={`/helpers?intake=${intakeId}&area=${encodeURIComponent(a.area)}`}>
            📍 {t("findHelper")}
          </Link>
        </div>

        {sections.map((n) => (
          <div className="card" key={n}>
            <h2 style={{ marginTop: 0 }}>
              {NEED_ICONS[n]} {t(`need_${n}`)}
            </h2>
            {(n === "food" || n === "clothes") && (
              <div className="card soft" style={{ marginBottom: 12 }}>
                <strong>{t("foodClothesNow")}</strong>
                <p className="small muted" style={{ margin: "4px 0 10px" }}>{t("foodClothesNowSub")}</p>
                <Link className="btn secondary" href={`/kiosk?code=${kioskCode ?? "NM-108"}&order=1&intake=${intakeId}`}>
                  🥫 {t("requestPickup")}
                </Link>
              </div>
            )}
            {n === "job" && (
              <Link className="btn secondary" href="/jobs" style={{ marginBottom: 12 }}>
                💼 {t("seeJobs")}
              </Link>
            )}
            {byNeed(n).length ? byNeed(n).map((r) => <ResourceCard key={r.id} r={r} />) : <p className="small muted">{t("noResources")}</p>}
          </div>
        ))}

        {general.length > 0 && (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>☎️ 24/7</h2>
            {general.map((r) => (
              <ResourceCard key={r.id} r={r} />
            ))}
          </div>
        )}

        <div className="row" style={{ marginTop: 20 }}>
          <Link className="btn ghost" href="/">
            {t("startOver")}
          </Link>
        </div>
        <p className="emergency">{t("emergency")}</p>
      </main>
    );
  }

  return (
    <main className="container">
      <div className="row between" style={{ marginBottom: 6 }}>
        <span className="small muted">{t("stepOf", { a: idx + 1, b: total })}</span>
        <LangSwitch compact />
      </div>
      <div className="progress">
        <div style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      {step === "household" && (
        <>
          <h1>{s("qHousehold")}</h1>
          <p className="hint">{t("qHouseholdHint")}</p>
          <div className="bigchoice">
            <button className={a.household === "single" ? "primary" : ""} onClick={() => set({ household: "single" })}>
              <div className="icon">🙋</div>
              <div className="title">{s("hhSingle")}</div>
              <div className="sub">{t("hhSingleSub")}</div>
            </button>
            <button className={a.household === "family" ? "primary" : ""} onClick={() => set({ household: "family" })}>
              <div className="icon">👨‍👩‍👧</div>
              <div className="title">{s("hhFamily")}</div>
              <div className="sub">{t("hhFamilySub")}</div>
            </button>
          </div>
        </>
      )}

      {step === "family" && (
        <>
          <h1>{s("qFamily")}</h1>
          <label className="field">{t("adults")}</label>
          <Counter value={a.adults} onChange={(v) => set({ adults: v })} min={1} />
          <label className="field">{t("children")}</label>
          <Counter value={a.children} onChange={(v) => set({ children: v })} />
          {a.children > 0 && (
            <>
              <label className="field">{t("childrenAges")}</label>
              <input type="text" placeholder={t("childrenAgesHint")} value={a.childrenAges} onChange={(e) => set({ childrenAges: e.target.value })} />
            </>
          )}
          <label className="field">{t("qPregnant")}</label>
          <YesNo value={a.pregnant} onChange={(v) => set({ pregnant: v })} skip />
          <label className="field">{t("qSenior")}</label>
          <YesNo value={a.senior} onChange={(v) => set({ senior: v })} />
        </>
      )}

      {step === "registrant" && (
        <>
          <h1>{t("qRegistrant")}</h1>
          <p className="hint">{t("qRegistrantHint")}</p>
          <label className="field">{t("yourName")}</label>
          <input type="text" value={a.registrantName} onChange={(e) => set({ registrantName: e.target.value })} />
          <label className="field">{t("relationship")}</label>
          <div className="chips">
            {["friend", "neighbor", "family", "caseworker", "volunteer", "other"].map((r) => (
              <button key={r} className={a.registrantRelationship === r ? "selected" : ""} onClick={() => set({ registrantRelationship: r })}>
                {t(`rel_${r}`)}
              </button>
            ))}
          </div>
        </>
      )}

      {step === "name" && (
        <>
          <h1>{a.household === "family" ? s("qNameFamily") : s("qName")}</h1>
          <p className="hint">{t("qNameHint")}</p>
          <input type="text" value={a.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </>
      )}

      {step === "sleep" && (
        <>
          <h1>{a.household === "family" ? s("qSleepFamily") : s("qSleep")}</h1>
          <YesNo value={a.hasSleep} onChange={(v) => set({ hasSleep: v })} />
        </>
      )}

      {step === "sleepDetails" && a.hasSleep === false && (
        <>
          <div className="card warm">
            <h3>{t("urgentTitle")}</h3>
            <p className="small">{someone ? t("urgentBodySomeone") : t("urgentBody")}</p>
          </div>
          <h2>{s("qArea")}</h2>
          <p className="hint">{t("qAreaHint")}</p>
          <select value={a.area} onChange={(e) => set({ area: e.target.value })}>
            <option value="">—</option>
            {AREAS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <label className="field">
            {t("qLandmark")} <span className="muted small">({t("optional")})</span>
          </label>
          <input type="text" placeholder={t("qLandmarkHint")} value={a.landmark} onChange={(e) => set({ landmark: e.target.value })} />
          <label className="field">{s("qHomelessDuration")}</label>
          <div className="chips">
            {["first", "months", "year", "repeat"].map((d) => (
              <button key={d} className={a.homelessDuration === d ? "selected" : ""} onClick={() => set({ homelessDuration: d })}>
                {t(`hd_${d}`)}
              </button>
            ))}
          </div>
        </>
      )}
      {step === "sleepDetails" && a.hasSleep !== false && (
        <>
          <h1>{s("qArea")}</h1>
          <select value={a.area} onChange={(e) => set({ area: e.target.value })}>
            <option value="">—</option>
            {AREAS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <label className="field">{s("qHowLong")}</label>
          <div className="chips">
            {["days", "weeks", "months", "year"].map((d) => (
              <button key={d} className={a.howLong === d ? "selected" : ""} onClick={() => set({ howLong: d })}>
                {t(`dur_${d}`)}
              </button>
            ))}
          </div>
          <label className="field">{s("qPay")}</label>
          <YesNo value={a.pays} onChange={(v) => set({ pays: v })} />
          {a.pays && (
            <>
              <label className="field">{t("qPayDetails")}</label>
              <input type="text" value={a.payDetails} onChange={(e) => set({ payDetails: e.target.value })} />
            </>
          )}
        </>
      )}

      {step === "danger" && (
        <>
          <h1>{s("qDanger")}</h1>
          <p className="hint">{t("qDangerHint")}</p>
          <YesNo value={a.inDanger} onChange={(v) => set({ inDanger: v })} skip />
          {a.inDanger && (
            <div className="card warm" style={{ marginTop: 14 }}>
              <strong>{t("dangerNow")}</strong>
              <p className="small" style={{ margin: "4px 0 8px" }}>{t("dangerBody")}</p>
              <a className="btn accent" href="tel:18007997233">
                📞 1-800-799-7233
              </a>
            </div>
          )}
        </>
      )}

      {step === "documents" && (
        <>
          <h1>{s("qDocuments")}</h1>
          <p className="hint">{t("qDocumentsHint")}</p>
          <label className="field">{s("qId")}</label>
          <YesNo value={a.hasId} onChange={(v) => set({ hasId: v })} />
          <label className="field">{s("qSsn")}</label>
          <YesNo value={a.hasSsn} onChange={(v) => set({ hasSsn: v })} />
          <label className="field">{s("qBirthCert")}</label>
          <YesNo value={a.hasBirthCert} onChange={(v) => set({ hasBirthCert: v })} />
          <label className="field">{s("qPhone")}</label>
          <YesNo value={a.hasPhone} onChange={(v) => set({ hasPhone: v })} />
        </>
      )}

      {step === "income" && (
        <>
          <h1>{s("qIncome")}</h1>
          <p className="hint">{t("qIncomeHint")}</p>
          <div className="chips">
            {["none", "job", "ssi", "other"].map((i) => (
              <button key={i} className={a.income === i ? "selected" : ""} onClick={() => set({ income: i })}>
                {t(`inc_${i}`)}
              </button>
            ))}
          </div>
          <label className="field">{s("qSnap")}</label>
          <YesNo value={a.hasSnap} onChange={(v) => set({ hasSnap: v })} />
          <label className="field">{s("qMedicaid")}</label>
          <YesNo value={a.hasMedicaid} onChange={(v) => set({ hasMedicaid: v })} />
        </>
      )}

      {step === "health" && (
        <>
          <h1>{s("qHealth")}</h1>
          <p className="hint">{t("qHealthHint")}</p>
          <label className="field">{s("qDisability")}</label>
          <YesNo value={a.disability} onChange={(v) => set({ disability: v })} skip />
          <label className="field">{s("qVeteran")}</label>
          <YesNo value={a.veteran} onChange={(v) => set({ veteran: v })} />
          <label className="field">{s("qRecovery")}</label>
          <YesNo value={a.recovery} onChange={(v) => set({ recovery: v })} skip />
        </>
      )}

      {step === "kids" && (
        <>
          <h1>{t("qKids")}</h1>
          <label className="field">{t("qKidsSchool")}</label>
          <YesNo value={a.kidsInSchool} onChange={(v) => set({ kidsInSchool: v })} />
          <label className="field">{t("qChildcare")}</label>
          <YesNo value={a.needsChildcare} onChange={(v) => set({ needsChildcare: v })} />
          <p className="hint" style={{ marginTop: 12 }}>{t("kidsNote")}</p>
        </>
      )}

      {step === "needs" && (
        <>
          <h1>{s("qNeeds")}</h1>
          <p className="hint">{t("qNeedsHintPre")}</p>
          <div className="chips">
            {NEEDS.map((n) => (
              <button key={n} className={a.needs.includes(n) ? "selected" : ""} onClick={() => toggleNeed(n)}>
                <span className="icon">{NEED_ICONS[n]}</span>
                {t(`need_${n}`)}
              </button>
            ))}
            <button className={`all ${a.needs.length === NEEDS.length ? "selected" : ""}`} onClick={() => set({ needs: [...NEEDS] })}>
              ✅ {t("allOfAbove")}
            </button>
          </div>
        </>
      )}

      {step === "contact" && (
        <>
          <h1>{s("qContact")}</h1>
          <p className="hint">{t("qContactHint")}</p>
          <input type="text" value={a.contact} onChange={(e) => set({ contact: e.target.value })} />
          <label className="field">
            {t("qNotes")} <span className="muted small">({t("optional")})</span>
          </label>
          <textarea value={a.notes} onChange={(e) => set({ notes: e.target.value })} />
          {error && <p className="error">{error}</p>}
        </>
      )}

      <div className="row between" style={{ marginTop: 24 }}>
        <button className="btn ghost" onClick={back} disabled={idx === 0}>
          ← {t("back")}
        </button>
        {step !== "contact" ? (
          <button className="btn" onClick={next} disabled={!canNext}>
            {t("next")} →
          </button>
        ) : (
          <button className="btn accent" onClick={submit} disabled={saving}>
            {saving ? t("saving") : t("submit")}
          </button>
        )}
      </div>
    </main>
  );
}
