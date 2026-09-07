"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { DOC_ICONS, DocumentCase, DocumentFile, DocumentStep, KioskLite, STEP_STATUSES, StepStatus, caseNumber, fullName, makePickupCode, wantedDocs } from "@/lib/documents";

const STAFF = ["helper", "driver", "admin"];
const HH_ADDRESS = "Helping Hand, c/o [warehouse address], North Miami, FL 33161";
const HH_PHONE = "410-553-1618";
const FORM_LABEL: Record<string, string> = { ss5: "SS-5 (Social Security card)", dh726: "DH 726 (Florida birth record)", cfes2337: "CF-ES 2337 (ACCESS: SNAP, Medicaid, cash)", letter: "Homeless verification letter" };

function Row({ k, v }: { k: string; v: string | null | undefined }) {
  return (
    <div className="prow">
      <span>{k}</span>
      <strong>{v || "—"}</strong>
    </div>
  );
}

const yn = (b: boolean | null | undefined) => (b === true ? "Yes" : b === false ? "No" : "—");

export default function Packet() {
  const { t } = useLang();
  const params = useSearchParams();
  const id = params.get("id");
  const { user, profile, loading } = useSession();
  const [c, setC] = useState<DocumentCase | null>(null);
  const [steps, setSteps] = useState<DocumentStep[]>([]);
  const [files, setFiles] = useState<(DocumentFile & { url?: string })[]>([]);
  const [kiosks, setKiosks] = useState<KioskLite[]>([]);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  // per-step edit state
  const [edit, setEdit] = useState<Record<string, { status: StepStatus; kiosk_id: string; pickup_code: string; appointment_at: string; detail: string }>>({});

  async function load() {
    if (!id) return;
    const sb = supabase();
    const [{ data: cs }, { data: st }, { data: fl }, { data: ks }] = await Promise.all([
      sb.from("document_cases").select("*").eq("id", id).maybeSingle(),
      sb.from("document_steps").select("*").eq("case_id", id).order("created_at"),
      sb.from("document_files").select("*").eq("case_id", id).order("created_at"),
      sb.from("kiosks").select("id,name,code,address,area"),
    ]);
    const cc = cs as DocumentCase | null;
    setC(cc);
    setNotes(cc?.notes ?? "");
    const ss = (st as DocumentStep[]) ?? [];
    setSteps(ss);
    setKiosks((ks as KioskLite[]) ?? []);
    const e: typeof edit = {};
    for (const s of ss) e[s.id] = { status: s.status, kiosk_id: s.kiosk_id ?? cc?.pickup_kiosk_id ?? "", pickup_code: s.pickup_code ?? "", appointment_at: s.appointment_at ? s.appointment_at.slice(0, 16) : "", detail: s.detail ?? "" };
    setEdit(e);
    const withUrls = await Promise.all(
      ((fl as DocumentFile[]) ?? []).map(async (f) => {
        const { data } = await sb.storage.from("case-docs").createSignedUrl(f.storage_path, 3600);
        return { ...f, url: data?.signedUrl };
      })
    );
    setFiles(withUrls);
  }

  useEffect(() => {
    if (profile && STAFF.includes(profile.role)) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, id]);

  async function saveStep(s: DocumentStep) {
    const e = edit[s.id];
    const patch: Record<string, unknown> = {
      status: e.status,
      kiosk_id: e.kiosk_id || null,
      pickup_code: e.status === "at_kiosk" && !e.pickup_code ? makePickupCode() : e.pickup_code || null,
      appointment_at: e.appointment_at ? new Date(e.appointment_at).toISOString() : null,
      detail: e.detail || null,
      updated_at: new Date().toISOString(),
    };
    await supabase().from("document_steps").update(patch).eq("id", s.id);
    setSaved(s.id);
    setTimeout(() => setSaved(null), 2500);
    load();
  }

  async function saveNotes() {
    if (!c) return;
    await supabase().from("document_cases").update({ notes }).eq("id", c.id);
    setSaved("notes");
    setTimeout(() => setSaved(null), 2500);
  }

  async function downloadForm(form: string) {
    if (!c) return;
    setBusy(form);
    setFormErr(null);
    try {
      const kk = kiosks.find((k) => k.id === c.pickup_kiosk_id);
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          form,
          data: { ...c, mailing_address: HH_ADDRESS, org_name: "Helping Hand", org_phone: HH_PHONE, navigator_name: profile?.display_name || profile?.username || "", kiosk_name: kk?.name ?? "", kiosk_address: kk?.address ?? "" },
        }),
      });
      if (!res.ok) throw new Error((await res.text()).slice(0, 200));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      a.download = m ? m[1] : `${form}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setFormErr(String(e));
    }
    setBusy(null);
  }

  async function assignMe() {
    if (!c || !user) return;
    await supabase().from("document_cases").update({ navigator_id: user.id }).eq("id", c.id);
    load();
  }

  if (loading) return <main className="container" />;
  if (!user || !profile || !STAFF.includes(profile.role))
    return (
      <main className="container">
        <h1>{t("navPacket")}</h1>
        <p className="muted">{t("navOnly")}</p>
      </main>
    );
  if (!c) return <main className="container"><p className="muted">…</p></main>;

  const name = fullName(c);
  const wants = wantedDocs(c);
  const kiosk = kiosks.find((k) => k.id === c.pickup_kiosk_id);
  const dobFmt = c.dob ? new Date(c.dob + "T00:00:00").toLocaleDateString("en-US") : "—";

  return (
    <main className="container packet">
      <div className="row between noprint">
        <Link href="/navigator" className="btn ghost small">← {t("navQueue")}</Link>
        <div className="row">
          {c.navigator_id !== user.id && <button className="btn secondary small" onClick={assignMe}>{t("navAssignMe")}</button>}
          <button className="btn small" onClick={() => window.print()}>🖨 {t("navPrint")}</button>
        </div>
      </div>

      <h1 style={{ marginBottom: 0 }}>{name || c.signature_name}</h1>
      <p className="muted" style={{ marginTop: 4 }}>
        {caseNumber(c.id)} · {t("navSubmittedOn")} {c.signed_at ? new Date(c.signed_at).toLocaleString("en-US") : "—"} · {t("navAssigned")}: {c.navigator_id ? (c.navigator_id === user.id ? "you" : "assigned") : t("navUnassigned")}
      </p>
      <div>
        {wants.map((d) => (
          <span className="tag" key={d}>{DOC_ICONS[d]} {t(`doc_${d}`)}</span>
        ))}
      </div>

      {/* Status controls */}
      <section className="noprint">
        <h2>{t("navSetStatus")}</h2>
        {steps.map((s) => {
          const e = edit[s.id];
          if (!e) return null;
          return (
            <div className="card" key={s.id}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{DOC_ICONS[s.doc_type]} {t(`doc_${s.doc_type}`)}</div>
              <label className="field">{t("navSetStatus")}</label>
              <select value={e.status} onChange={(ev) => setEdit({ ...edit, [s.id]: { ...e, status: ev.target.value as StepStatus } })}>
                {STEP_STATUSES.map((x) => (
                  <option key={x} value={x}>{t(`st_${x}`)}</option>
                ))}
              </select>
              {(e.status === "at_kiosk" || e.status === "at_warehouse" || e.status === "appointment") && (
                <>
                  <label className="field">{t("navKiosk")}</label>
                  <select value={e.kiosk_id} onChange={(ev) => setEdit({ ...edit, [s.id]: { ...e, kiosk_id: ev.target.value } })}>
                    <option value="">—</option>
                    {kiosks.map((k) => (
                      <option key={k.id} value={k.id}>{k.name} ({k.code})</option>
                    ))}
                  </select>
                </>
              )}
              {e.status === "at_kiosk" && (
                <>
                  <label className="field">{t("navCode")}</label>
                  <div className="row" style={{ flexWrap: "nowrap" }}>
                    <input type="text" value={e.pickup_code} onChange={(ev) => setEdit({ ...edit, [s.id]: { ...e, pickup_code: ev.target.value.toUpperCase() } })} style={{ maxWidth: 160 }} />
                    <button className="btn ghost small" onClick={() => setEdit({ ...edit, [s.id]: { ...e, pickup_code: makePickupCode() } })}>🎲</button>
                  </div>
                </>
              )}
              {e.status === "appointment" && (
                <>
                  <label className="field">{t("navAppointment")}</label>
                  <input type="datetime-local" value={e.appointment_at} onChange={(ev) => setEdit({ ...edit, [s.id]: { ...e, appointment_at: ev.target.value } })} />
                </>
              )}
              <label className="field">{t("navDetail")}</label>
              <input type="text" value={e.detail} onChange={(ev) => setEdit({ ...edit, [s.id]: { ...e, detail: ev.target.value } })} />
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn" onClick={() => saveStep(s)}>{t("navSave")}</button>
                {saved === s.id && <span className="success">{t("navSaved")}</span>}
              </div>
            </div>
          );
        })}
        <div className="card">
          <label className="field" style={{ marginTop: 0 }}>{t("navNotes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn secondary" onClick={saveNotes}>{t("save")}</button>
            {saved === "notes" && <span className="success">{t("saved")}</span>}
          </div>
        </div>
      </section>

      {/* Person summary */}
      <section className="psheet">
        <h2>{t("docsAbout")}</h2>
        <Row k="Legal name" v={name} />
        <Row k="Other names used" v={c.other_names} />
        <Row k="Date of birth" v={dobFmt} />
        <Row k="Sex" v={c.sex} />
        <Row k="Place of birth" v={[c.birth_city, c.birth_state, c.birth_country].filter(Boolean).join(", ")} />
        <Row k="Mother's name" v={c.mother_name} />
        <Row k="Mother's maiden name" v={c.mother_maiden} />
        <Row k="Father's name" v={c.father_name} />
        <Row k="Knows SSN" v={c.ssn_known ? `Yes (last 4: ${c.ssn_last4 || "—"})` : yn(c.ssn_known)} />
        <Row k="U.S. citizen" v={yn(c.us_citizen)} />
        <Row k="Has photo ID" v={yn(c.has_photo_id)} />
        <Row k="Has birth certificate" v={yn(c.has_birth_cert)} />
        <Row k="Has SS card" v={yn(c.has_ssn_card)} />
        <Row k="Other papers" v={c.has_other_doc} />
        <Row k="Phone" v={c.phone} />
        <Row k="Best way to reach" v={c.best_way_to_reach ? t(`reach_${c.best_way_to_reach}`) : null} />
        <Row k="Pickup kiosk" v={kiosk ? `${kiosk.name} — ${kiosk.address ?? ""}` : null} />
        <Row k="Mailing address for agencies" v={HH_ADDRESS} />
        {c.intake_id && <Row k={t("navHousehold")} v={`HH-${c.intake_id.slice(0, 6).toUpperCase()}`} />}
      </section>

      {/* Photos */}
      {files.length > 0 && (
        <section className="noprint">
          <h2>{t("navFiles")}</h2>
          <div className="row">
            {files.map((f) => (
              <a key={f.id} className="btn secondary small" href={f.url} target="_blank" rel="noreferrer">
                📎 {f.label || f.storage_path.split("/").pop()} · {t("navView")}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Filled official forms */}
      <section className="noprint">
        <h2>{t("navFilledForms")}</h2>
        <p className="small muted">{t("navFilledFormsSub")}</p>
        <div className="row">
          {wants.includes("ssn_card") && <button className="btn secondary" disabled={!!busy} onClick={() => downloadForm("ss5")}>📄 {busy === "ss5" ? "…" : FORM_LABEL.ss5}</button>}
          {wants.includes("birth_cert") && <button className="btn secondary" disabled={!!busy} onClick={() => downloadForm("dh726")}>📄 {busy === "dh726" ? "…" : FORM_LABEL.dh726}</button>}
          {wants.includes("benefits") && <button className="btn secondary" disabled={!!busy} onClick={() => downloadForm("cfes2337")}>📄 {busy === "cfes2337" ? "…" : FORM_LABEL.cfes2337}</button>}
          <button className="btn secondary" disabled={!!busy} onClick={() => downloadForm("letter")}>📄 {busy === "letter" ? "…" : FORM_LABEL.letter}</button>
        </div>
        {formErr && <p className="small" style={{ color: "#a5462f", marginTop: 8 }}>{formErr}</p>}
      </section>

      {/* Pre-filled forms */}
      <section>
        <h2>{t("navForms")}</h2>

        {wants.includes("ssn_card") && (
          <div className="psheet">
            <h3>{t("navFormSs5")}</h3>
            <Row k="1. Name to be shown on card" v={name} />
            <Row k="2. Name at birth" v={name} />
            <Row k="3. Other names used" v={c.other_names} />
            <Row k="4. SSN (if known)" v={c.ssn_known ? `***-**-${c.ssn_last4 || "____"} (navigator: obtain full SSN in person)` : "Unknown — request search"} />
            <Row k="5. Place of birth" v={[c.birth_city, c.birth_state, c.birth_country].filter(Boolean).join(", ")} />
            <Row k="6. Date of birth" v={dobFmt} />
            <Row k="7. Citizenship" v={c.us_citizen ? "U.S. citizen" : c.us_citizen === false ? "Non-citizen — see immigration doc" : "—"} />
            <Row k="9. Sex" v={c.sex} />
            <Row k="10. Mother's name at her birth" v={c.mother_maiden || c.mother_name} />
            <Row k="11. Father's name" v={c.father_name} />
            <Row k="16. Mailing address" v={HH_ADDRESS} />
            <Row k="17. Phone" v={c.phone || "Contact via Helping Hand navigator"} />
            <Row k="Evidence" v={[c.has_photo_id ? "photo ID" : null, c.has_birth_cert ? "birth certificate" : null, c.has_other_doc].filter(Boolean).join(", ") || "None on hand — use homeless-verification letter + any medical/school record"} />
            <p className="small muted">Replacement card is free. Bring one identity document; a shelter/agency letter on letterhead plus a medical record is commonly accepted. Card arrives by mail in ~14 days to the Helping Hand address.</p>
          </div>
        )}

        {wants.includes("birth_cert") && (
          <div className="psheet">
            <h3>{t("navFormBirth")}</h3>
            <Row k="Name on record" v={name} />
            <Row k="Date of birth" v={dobFmt} />
            <Row k="City / county of birth" v={c.birth_city} />
            <Row k="State / country" v={[c.birth_state, c.birth_country].filter(Boolean).join(", ")} />
            <Row k="Sex" v={c.sex} />
            <Row k="Mother's full maiden name" v={c.mother_maiden || c.mother_name} />
            <Row k="Father's full name" v={c.father_name} />
            <Row k="Applicant" v={`${name} (self)`} />
            <Row k="Mail to" v={HH_ADDRESS} />
            <p className="small muted">
              Florida-born: DH 726 to FL Dept. of Health Vital Statistics — fee waivable for people experiencing homelessness with a verification letter (see FL Statute 382.025). Born elsewhere: use that state&apos;s vital-records form; navigator to request fee waiver where available.
            </p>
          </div>
        )}

        {wants.includes("fl_id") && (
          <div className="psheet">
            <h3>{t("navFormId")}</h3>
            <Row k="Applicant" v={name} />
            <Row k="Date of birth" v={dobFmt} />
            <Row k="Primary ID (needed)" v={c.has_birth_cert ? "Birth certificate — on hand" : "Birth certificate — order first (see above)"} />
            <Row k="SSN proof (needed)" v={c.has_ssn_card ? "SS card — on hand" : "SS card — order first (see above)"} />
            <Row k="Residential address proof" v="Certification of Address (HSMV 71120) + homeless-verification letter from Helping Hand" />
            <Row k="Fee" v="Waived — ID card fee exemption for homeless applicants with verification letter" />
            <Row k="Appointment" v="Book at a Miami-Dade FLHSMV / Tax Collector office; navigator accompanies; driver transport via app" />
            <p className="small muted">The person must appear once in person. Everything else — forms, fee waiver, letter, ride — is done by Helping Hand.</p>
          </div>
        )}

        {wants.includes("benefits") && (
          <div className="psheet">
            <h3>{t("navFormAccess")}</h3>
            <Row k="Applicant" v={name} />
            <Row k="Date of birth" v={dobFmt} />
            <Row k="SSN" v={c.ssn_known ? `known (last 4 ${c.ssn_last4 || "—"})` : "unknown — apply; SSA card in progress"} />
            <Row k="Citizenship" v={yn(c.us_citizen)} />
            <Row k="Living situation" v="Experiencing homelessness — expedited SNAP (7-day) screening" />
            <Row k="Mailing address" v={HH_ADDRESS} />
            <Row k="Programs" v="SNAP (food), Medicaid, Temporary Cash Assistance — screen all" />
            <Row k="Interview" v="Phone interview — schedule through navigator; use kiosk phone or navigator's phone" />
            <p className="small muted">Submit through the DCF ACCESS Community Partner portal. EBT card mails to the Helping Hand address, then goes to the kiosk like any other document.</p>
          </div>
        )}
      </section>

      {/* Authorizations */}
      <section className="psheet">
        <h2>{t("docsConsent")}</h2>
        <Row k={t("navMailAuth")} v={c.mail_authorized ? t("navSigned") : t("navNotSigned")} />
        <p className="small">{t("consentMail")}</p>
        <Row k={t("navRepAuth")} v={c.representative_authorized ? t("navSigned") : t("navNotSigned")} />
        <p className="small">{t("consentRep")}</p>
        <Row k="Signed name" v={c.signature_name} />
        <Row k="Date" v={c.signed_at ? new Date(c.signed_at).toLocaleString("en-US") : null} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {c.signature_data && <img src={c.signature_data} alt="signature" className="sigimg" />}
      </section>

      {c.notes && (
        <section className="psheet">
          <h2>{t("navNotes")}</h2>
          <p className="small">{c.notes}</p>
        </section>
      )}
    </main>
  );
}
