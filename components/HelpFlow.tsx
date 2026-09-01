"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { AREAS, NEEDS, Need } from "@/lib/i18n";
import { supabase, Resource } from "@/lib/supabase";
import { ResourceCard } from "./ResourceList";
import LangSwitch from "./LangSwitch";
import PinLogin from "./PinLogin";
import { useSession } from "@/lib/useSession";

const NEED_ICONS: Record<Need, string> = {
  housing: "🏠",
  id: "🪪",
  ssn: "📄",
  food: "🥫",
  clothes: "👕",
  job: "💼",
  healthcare: "🩺",
  addiction: "💚",
  phone: "📱",
};

type Answers = {
  name: string;
  hasId: boolean | null;
  hasPhone: boolean | null;
  hasSleep: boolean | null;
  area: string;
  landmark: string;
  howLong: string;
  pays: boolean | null;
  payDetails: string;
  needs: Need[];
  contact: string;
  notes: string;
};

const empty: Answers = {
  name: "",
  hasId: null,
  hasPhone: null,
  hasSleep: null,
  area: "",
  landmark: "",
  howLong: "",
  pays: null,
  payDetails: "",
  needs: [],
  contact: "",
  notes: "",
};

export default function HelpFlow() {
  const { t, lang } = useLang();
  const params = useSearchParams();
  const someone = params.get("for") === "someone";
  const kioskCode = params.get("kiosk");
  const s = (key: string) => t(someone ? `${key}Someone` : key);

  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(empty);
  const [saving, setSaving] = useState(false);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { user } = useSession();
  const [claimed, setClaimed] = useState(false);

  async function claimIntake() {
    const { data: u } = await supabase().auth.getUser();
    if (!u.user || !intakeId) return;
    await supabase().from("intakes").update({ user_id: u.user.id }).eq("id", intakeId);
    setClaimed(true);
  }

  // Steps: 0 name, 1 id, 2 phone, 3 sleep, 4 sleep details (urgent or where), 5 needs, 6 contact, 7 results
  const total = 7;
  const set = (patch: Partial<Answers>) => setA((prev) => ({ ...prev, ...patch }));
  const next = () => setStep((x) => Math.min(x + 1, total));
  const back = () => setStep((x) => Math.max(x - 1, 0));

  useEffect(() => {
    if (a.hasSleep === false && !a.needs.includes("housing")) set({ needs: [...a.needs, "housing"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.hasSleep]);

  async function submit() {
    setSaving(true);
    setError(null);
    const needs = [...a.needs];
    if (a.hasId === false && !needs.includes("id")) needs.push("id");
    if (a.hasPhone === false && !needs.includes("phone")) needs.push("phone");
    const sb = supabase();
    const { data: userData } = await sb.auth.getUser();
    let kioskId: string | null = null;
    if (kioskCode) {
      const { data: k } = await sb.from("kiosks").select("id").eq("code", kioskCode).maybeSingle();
      kioskId = k?.id ?? null;
    }
    // Generate the id client-side so people without an account (no SELECT rights) can still submit.
    const newId = crypto.randomUUID();
    const { error } = await sb
      .from("intakes")
      .insert({
        id: newId,
        user_id: userData.user?.id ?? null,
        kiosk_id: kioskId,
        on_behalf_of: someone,
        language: lang,
        has_id: a.hasId,
        has_phone: a.hasPhone,
        has_place_to_sleep: a.hasSleep,
        sleep_area: a.landmark || null,
        sleep_how_long: a.howLong || null,
        pays_rent: a.pays,
        rent_details: a.payDetails || null,
        first_name: a.name || null,
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
    const { data: res } = await sb
      .from("resources")
      .select("*")
      .in("need", [...needs, "general"])
      .order("priority");
    setResources((res as Resource[]) ?? []);
    set({ needs: needs as Need[] });
    setSaving(false);
    setStep(7);
    window.scrollTo({ top: 0 });
  }

  const canNext = useMemo(() => {
    switch (step) {
      case 1:
        return a.hasId !== null;
      case 2:
        return a.hasPhone !== null;
      case 3:
        return a.hasSleep !== null;
      case 4:
        return a.hasSleep === false ? true : a.area !== "";
      case 5:
        return a.needs.length > 0;
      default:
        return true;
    }
  }, [step, a]);

  const toggleNeed = (n: Need) =>
    set({ needs: a.needs.includes(n) ? a.needs.filter((x) => x !== n) : [...a.needs, n] });

  const YesNo = ({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) => (
    <div className="yesno">
      <button className={value === true ? "selected" : ""} onClick={() => onChange(true)}>
        {t("yes")}
      </button>
      <button className={value === false ? "selected" : ""} onClick={() => onChange(false)}>
        {t("no")}
      </button>
    </div>
  );

  if (step === 7) {
    const byNeed = (n: string) => resources.filter((r) => r.need === n);
    const general = byNeed("general");
    return (
      <main className="container">
        <h1>{someone && a.name ? t("planTitleSomeone", { name: a.name }) : t("planTitle")}</h1>
        <p className="muted">{t("planIntro")}</p>
        {intakeId && (
          <div className="card soft">
            <div className="small muted">{t("yourNumber")}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: ".05em" }}>HH-{intakeId.slice(0, 6).toUpperCase()}</div>
            <div className="hint">{t("showThis")}</div>
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

        <div className="card">
          <h3>{t("findHelper")}</h3>
          <p className="small muted">{t("findHelperSub")}</p>
          <Link className="btn block" href={`/helpers?intake=${intakeId}&area=${encodeURIComponent(a.area)}`}>
            📍 {t("findHelper")}
          </Link>
        </div>

        {a.needs.map((n) => (
          <div className="card" key={n}>
            <h2 style={{ marginTop: 0 }}>
              {NEED_ICONS[n]} {t(`need_${n}`)}
            </h2>
            {n === "food" || n === "clothes" ? (
              <div className="card soft" style={{ marginBottom: 12 }}>
                <strong>{t("foodClothesNow")}</strong>
                <p className="small muted" style={{ margin: "4px 0 10px" }}>{t("foodClothesNowSub")}</p>
                <Link className="btn secondary" href={`/kiosk?code=${kioskCode ?? "NM-108"}&order=1&intake=${intakeId}`}>
                  🥫 {t("requestPickup")}
                </Link>
              </div>
            ) : null}
            {n === "job" ? (
              <Link className="btn secondary" href="/jobs" style={{ marginBottom: 12 }}>
                💼 {t("seeJobs")}
              </Link>
            ) : null}
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
        <span className="small muted">{t("stepOf", { a: step + 1, b: total })}</span>
        <LangSwitch compact />
      </div>
      <div className="progress">
        <div style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>

      {step === 0 && (
        <>
          <h1>{s("qName")}</h1>
          <p className="hint">{t("qNameHint")}</p>
          <input type="text" value={a.name} onChange={(e) => set({ name: e.target.value })} autoFocus />
        </>
      )}
      {step === 1 && (
        <>
          <h1>{s("qId")}</h1>
          <YesNo value={a.hasId} onChange={(v) => set({ hasId: v })} />
        </>
      )}
      {step === 2 && (
        <>
          <h1>{s("qPhone")}</h1>
          <YesNo value={a.hasPhone} onChange={(v) => set({ hasPhone: v })} />
        </>
      )}
      {step === 3 && (
        <>
          <h1>{s("qSleep")}</h1>
          <YesNo value={a.hasSleep} onChange={(v) => set({ hasSleep: v })} />
        </>
      )}
      {step === 4 && a.hasSleep === false && (
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
        </>
      )}
      {step === 4 && a.hasSleep !== false && (
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
      {step === 5 && (
        <>
          <h1>{s("qNeeds")}</h1>
          <p className="hint">{t("qNeedsHint")}</p>
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
      {step === 6 && (
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
        <button className="btn ghost" onClick={back} disabled={step === 0}>
          ← {t("back")}
        </button>
        {step < 6 ? (
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
