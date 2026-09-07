"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { useSession } from "@/lib/useSession";
import { supabase } from "@/lib/supabase";
import { DOC_ICONS, DOC_TYPES, DocType, DocumentCase, DocumentFile, KioskLite, caseNumber, fullName } from "@/lib/documents";
import PinLogin from "./PinLogin";
import LangSwitch from "./LangSwitch";
import SignaturePad from "./SignaturePad";
import CameraCapture from "./CameraCapture";
import DocStatus from "./DocStatus";

type Tri = boolean | null;
type StepId = "which" | "about" | "parents" | "ssn" | "have" | "reach" | "consent";
const STEPS: StepId[] = ["which", "about", "parents", "ssn", "have", "reach", "consent"];

type Draft = {
  wants: DocType[];
  legal_first: string;
  legal_middle: string;
  legal_last: string;
  other_names: string;
  dob: string;
  sex: string;
  birth_city: string;
  birth_state: string;
  birth_country: string;
  mother_name: string;
  mother_maiden: string;
  father_name: string;
  ssn_known: Tri;
  ssn_last4: string;
  us_citizen: Tri;
  has_photo_id: Tri;
  has_birth_cert: Tri;
  has_ssn_card: Tri;
  has_other_doc: string;
  phone: string;
  best_way_to_reach: string;
  pickup_kiosk_id: string;
  mail_authorized: boolean;
  representative_authorized: boolean;
  truth: boolean;
  signature_name: string;
  signature_data: string | null;
};

const EMPTY: Draft = {
  wants: [],
  legal_first: "",
  legal_middle: "",
  legal_last: "",
  other_names: "",
  dob: "",
  sex: "",
  birth_city: "",
  birth_state: "FL",
  birth_country: "USA",
  mother_name: "",
  mother_maiden: "",
  father_name: "",
  ssn_known: null,
  ssn_last4: "",
  us_citizen: null,
  has_photo_id: null,
  has_birth_cert: null,
  has_ssn_card: null,
  has_other_doc: "",
  phone: "",
  best_way_to_reach: "app",
  pickup_kiosk_id: "",
  mail_authorized: false,
  representative_authorized: false,
  truth: false,
  signature_name: "",
  signature_data: null,
};

export default function DocumentCenter({ kiosk = false }: { kiosk?: boolean }) {
  const { t } = useLang();
  const params = useSearchParams();
  const { user, profile, loading } = useSession();
  const [existing, setExisting] = useState<DocumentCase | null | undefined>(undefined);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [d, setD] = useState<Draft>(EMPTY);
  const [idx, setIdx] = useState(0);
  const [kiosks, setKiosks] = useState<KioskLite[]>([]);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [photoLabel, setPhotoLabel] = useState("");
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  // Load an open case (status view) or start a draft
  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb = supabase();
      const [{ data: c }, { data: k }] = await Promise.all([
        sb.from("document_cases").select("*").eq("user_id", user.id).neq("status", "closed").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        sb.from("kiosks").select("id,name,code,address,area").eq("active", true),
      ]);
      setKiosks((k as KioskLite[]) ?? []);
      const kioskCode = params.get("kiosk");
      const found = c as DocumentCase | null;
      if (found && found.signed_at) {
        setExisting(found);
        setCaseId(found.id);
        const { data: f } = await sb.from("document_files").select("*").eq("case_id", found.id).order("created_at");
        setFiles((f as DocumentFile[]) ?? []);
        return;
      }
      setExisting(null);
      if (found) {
        // resume an unsigned draft
        setCaseId(found.id);
        setD((x) => ({
          ...x,
          wants: DOC_TYPES.filter((t) => (found as unknown as Record<string, boolean>)[`wants_${t}`]),
          legal_first: found.legal_first ?? "",
          legal_middle: found.legal_middle ?? "",
          legal_last: found.legal_last ?? "",
          dob: found.dob ?? "",
          pickup_kiosk_id: found.pickup_kiosk_id ?? x.pickup_kiosk_id,
        }));
        const { data: f } = await sb.from("document_files").select("*").eq("case_id", found.id).order("created_at");
        setFiles((f as DocumentFile[]) ?? []);
      } else {
        const id = crypto.randomUUID();
        const want = (params.get("need") ?? "").split(",").filter((x): x is DocType => (DOC_TYPES as readonly string[]).includes(x));
        const kk = kioskCode ? ((k as KioskLite[]) ?? []).find((x) => x.code === kioskCode) : null;
        await sb.from("document_cases").insert({
          id,
          user_id: user.id,
          intake_id: params.get("intake") || null,
          status: "open",
          pickup_kiosk_id: kk?.id ?? null,
          legal_first: profile?.display_name ?? null,
        });
        setCaseId(id);
        setD((x) => ({ ...x, wants: want, pickup_kiosk_id: kk?.id ?? "", legal_first: profile?.display_name ?? "" }));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!d.pickup_kiosk_id && kiosks.length) set({ pickup_kiosk_id: kiosks[0].id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kiosks]);

  async function saveDraft(patch: Record<string, unknown>) {
    if (!caseId) return;
    await supabase().from("document_cases").update(patch).eq("id", caseId);
  }

  async function next() {
    // persist what we have so far, one step at a time
    const step = STEPS[idx];
    if (step === "which") await saveDraft(Object.fromEntries(DOC_TYPES.map((x) => [`wants_${x}`, d.wants.includes(x)])));
    if (step === "about")
      await saveDraft({
        legal_first: d.legal_first || null,
        legal_middle: d.legal_middle || null,
        legal_last: d.legal_last || null,
        other_names: d.other_names || null,
        dob: d.dob || null,
        sex: d.sex || null,
        birth_city: d.birth_city || null,
        birth_state: d.birth_state || null,
        birth_country: d.birth_country || null,
      });
    if (step === "parents") await saveDraft({ mother_name: d.mother_name || null, mother_maiden: d.mother_maiden || null, father_name: d.father_name || null });
    if (step === "ssn") await saveDraft({ ssn_known: d.ssn_known, ssn_last4: d.ssn_last4 || null, us_citizen: d.us_citizen });
    if (step === "have") await saveDraft({ has_photo_id: d.has_photo_id, has_birth_cert: d.has_birth_cert, has_ssn_card: d.has_ssn_card, has_other_doc: d.has_other_doc || null });
    if (step === "reach") await saveDraft({ phone: d.phone || null, best_way_to_reach: d.best_way_to_reach, pickup_kiosk_id: d.pickup_kiosk_id || null });
    setIdx((i) => Math.min(STEPS.length - 1, i + 1));
    window.scrollTo({ top: 0 });
  }

  async function submit() {
    if (!caseId || !user) return;
    setSending(true);
    const sb = supabase();
    await sb
      .from("document_cases")
      .update({
        mail_authorized: d.mail_authorized,
        representative_authorized: d.representative_authorized,
        signature_name: d.signature_name,
        signature_data: d.signature_data,
        signed_at: new Date().toISOString(),
        status: "in_progress",
        pickup_kiosk_id: d.pickup_kiosk_id || null,
      })
      .eq("id", caseId);
    await sb.from("document_steps").insert(
      d.wants.map((doc_type) => ({ case_id: caseId, user_id: user.id, doc_type, status: "ready", kiosk_id: d.pickup_kiosk_id || null }))
    );
    setSending(false);
    setSubmitted(true);
    window.scrollTo({ top: 0 });
  }

  async function upload(file: File) {
    if (!caseId || !user) return;
    setUploading(true);
    const sb = supabase();
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${caseId}/${Date.now()}.${ext}`;
    const { error } = await sb.storage.from("case-docs").upload(path, file, { contentType: file.type || "image/jpeg" });
    if (!error) {
      const { data } = await sb.from("document_files").insert({ case_id: caseId, user_id: user.id, label: photoLabel || null, storage_path: path }).select().single();
      if (data) setFiles((f) => [...f, data as DocumentFile]);
      setPhotoLabel("");
    }
    setUploading(false);
  }

  if (loading || (user && existing === undefined)) return <main className="container" />;

  if (!user)
    return (
      <main className="container">
        <h1>{t("docsTitle")}</h1>
        <p className="muted">{t("docsIntro")}</p>
        <p className="small">{t("docsSignIn")}</p>
        <PinLogin compact={kiosk} />
      </main>
    );

  // ── Status view ─────────────────────────────────────────────
  if (existing || submitted)
    return (
      <main className="container">
        <div className="row between">
          <h1>{t("docsStatusTitle")}</h1>
          {!kiosk && <LangSwitch compact />}
        </div>
        <p className="muted">{t("docsStatusIntro")}</p>
        {caseId && (
          <div className="card soft">
            <div className="small muted">{t("docsCaseNumber")}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: ".05em" }}>{caseNumber(caseId)}</div>
            <div className="hint">{t("showThis")}</div>
          </div>
        )}
        <DocStatus userId={user.id} />
        <div className="card">
          <h3>📷 {t("photos")}</h3>
          <p className="small muted">{t("docsPhotosNote")}</p>
          <PhotoUploader files={files} uploading={uploading} label={photoLabel} setLabel={setPhotoLabel} onFile={upload} t={t} />
        </div>
      </main>
    );

  // ── Wizard ──────────────────────────────────────────────────
  const step = STEPS[idx];
  const canNext =
    step === "which" ? d.wants.length > 0 : step === "about" ? d.legal_first.trim() && d.legal_last.trim() && d.dob : true;
  const canSubmit = d.mail_authorized && d.representative_authorized && d.truth && d.signature_name.trim() && d.signature_data;

  const YesNo = ({ value, onChange }: { value: Tri; onChange: (v: Tri) => void }) => (
    <div className="yesno">
      <button className={value === true ? "selected" : ""} onClick={() => onChange(true)}>{t("yes")}</button>
      <button className={value === false ? "selected" : ""} onClick={() => onChange(false)}>{t("no")}</button>
    </div>
  );

  return (
    <main className="container">
      <div className="row between" style={{ marginBottom: 6 }}>
        <span className="small muted">{t("stepOf", { a: idx + 1, b: STEPS.length })} · {t("docsTitle")}</span>
        {!kiosk && <LangSwitch compact />}
      </div>
      <div className="progress">
        <div style={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} />
      </div>

      {step === "which" && (
        <>
          <h1>{t("docsWhich")}</h1>
          <p className="hint">{t("docsWhichSub")}</p>
          <div className="bigchoice">
            {DOC_TYPES.map((x) => (
              <button key={x} className={d.wants.includes(x) ? "primary" : ""} onClick={() => set({ wants: d.wants.includes(x) ? d.wants.filter((y) => y !== x) : [...d.wants, x] })}>
                <div className="icon">{DOC_ICONS[x]}</div>
                <div className="title">{t(`doc_${x}`)}</div>
                <div className="sub">{t(`doc_${x}_sub`)}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "about" && (
        <>
          <h1>{t("docsAbout")}</h1>
          <p className="hint">{t("docsAboutSub")}</p>
          <label className="field">{t("legalFirst")}</label>
          <input type="text" value={d.legal_first} onChange={(e) => set({ legal_first: e.target.value })} />
          <label className="field">{t("legalMiddle")} <span className="muted">({t("optional")})</span></label>
          <input type="text" value={d.legal_middle} onChange={(e) => set({ legal_middle: e.target.value })} />
          <label className="field">{t("legalLast")}</label>
          <input type="text" value={d.legal_last} onChange={(e) => set({ legal_last: e.target.value })} />
          <label className="field">{t("otherNames")} <span className="muted">({t("optional")})</span></label>
          <input type="text" value={d.other_names} onChange={(e) => set({ other_names: e.target.value })} />
          <label className="field">{t("dob")}</label>
          <input type="date" value={d.dob} onChange={(e) => set({ dob: e.target.value })} />
          <label className="field">{t("sex")}</label>
          <div className="chips">
            {["male", "female", "x"].map((s) => (
              <button key={s} className={d.sex === s ? "selected" : ""} onClick={() => set({ sex: s })}>{t(`sex_${s}`)}</button>
            ))}
          </div>
          <label className="field">{t("birthPlace")}</label>
          <input type="text" placeholder={t("birthCity")} value={d.birth_city} onChange={(e) => set({ birth_city: e.target.value })} />
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input type="text" placeholder={t("birthState")} value={d.birth_state} onChange={(e) => set({ birth_state: e.target.value })} />
            <input type="text" placeholder={t("birthCountry")} value={d.birth_country} onChange={(e) => set({ birth_country: e.target.value })} />
          </div>
        </>
      )}

      {step === "parents" && (
        <>
          <h1>{t("docsParents")}</h1>
          <p className="hint">{t("docsParentsSub")}</p>
          <label className="field">{t("motherName")}</label>
          <input type="text" value={d.mother_name} onChange={(e) => set({ mother_name: e.target.value })} />
          <label className="field">{t("motherMaiden")}</label>
          <input type="text" value={d.mother_maiden} onChange={(e) => set({ mother_maiden: e.target.value })} />
          <label className="field">{t("fatherName")}</label>
          <input type="text" value={d.father_name} onChange={(e) => set({ father_name: e.target.value })} />
        </>
      )}

      {step === "ssn" && (
        <>
          <h1>{t("docsSsn")}</h1>
          <label className="field">{t("ssnKnown")}</label>
          <YesNo value={d.ssn_known} onChange={(v) => set({ ssn_known: v })} />
          {d.ssn_known && (
            <>
              <label className="field">{t("ssnLast4")}</label>
              <input type="text" inputMode="numeric" maxLength={4} value={d.ssn_last4} onChange={(e) => set({ ssn_last4: e.target.value.replace(/\D/g, "").slice(0, 4) })} style={{ maxWidth: 160 }} />
              <p className="hint">{t("ssnFullLater")}</p>
            </>
          )}
          <label className="field">{t("usCitizen")}</label>
          <YesNo value={d.us_citizen} onChange={(v) => set({ us_citizen: v })} />
          {d.us_citizen === false && <p className="hint">{t("notCitizenNote")}</p>}
        </>
      )}

      {step === "have" && (
        <>
          <h1>{t("docsHave")}</h1>
          <p className="hint">{t("docsHaveSub")}</p>
          <label className="field">{t("havePhotoId")}</label>
          <YesNo value={d.has_photo_id} onChange={(v) => set({ has_photo_id: v })} />
          <label className="field">{t("haveBirthCert")}</label>
          <YesNo value={d.has_birth_cert} onChange={(v) => set({ has_birth_cert: v })} />
          <label className="field">{t("haveSsnCard")}</label>
          <YesNo value={d.has_ssn_card} onChange={(v) => set({ has_ssn_card: v })} />
          <label className="field">{t("haveOther")}</label>
          <input type="text" value={d.has_other_doc} onChange={(e) => set({ has_other_doc: e.target.value })} />
          <div className="card" style={{ marginTop: 16 }}>
            <h3 style={{ marginTop: 0 }}>📷 {t("photos")}</h3>
            <PhotoUploader files={files} uploading={uploading} label={photoLabel} setLabel={setPhotoLabel} onFile={upload} t={t} />
          </div>
        </>
      )}

      {step === "reach" && (
        <>
          <h1>{t("docsReach")}</h1>
          <p className="hint">{t("docsReachSub")}</p>
          <label className="field">{t("phoneOptional")}</label>
          <input type="tel" value={d.phone} onChange={(e) => set({ phone: e.target.value })} />
          <label className="field">{t("bestWay")}</label>
          <div className="chips">
            {["app", "helper", "phone"].map((s) => (
              <button key={s} className={d.best_way_to_reach === s ? "selected" : ""} onClick={() => set({ best_way_to_reach: s })}>{t(`reach_${s}`)}</button>
            ))}
          </div>
          <label className="field">{t("pickupKiosk")}</label>
          <p className="hint" style={{ marginTop: 0 }}>{t("pickupKioskSub")}</p>
          <div className="bigchoice">
            {kiosks.map((k) => (
              <button key={k.id} className={d.pickup_kiosk_id === k.id ? "primary" : ""} onClick={() => set({ pickup_kiosk_id: k.id })}>
                <div className="title" style={{ fontSize: 19 }}>📍 {k.name}</div>
                <div className="sub" style={{ fontSize: 14 }}>{k.address}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {step === "consent" && (
        <>
          <h1>{t("docsConsent")}</h1>
          <p className="hint">{t("docsConsentSub")}</p>
          <label className="check">
            <input type="checkbox" checked={d.mail_authorized} onChange={(e) => set({ mail_authorized: e.target.checked })} />
            <span>{t("consentMail")}</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={d.representative_authorized} onChange={(e) => set({ representative_authorized: e.target.checked })} />
            <span>{t("consentRep")}</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={d.truth} onChange={(e) => set({ truth: e.target.checked })} />
            <span>{t("consentTruth")}</span>
          </label>
          <label className="field">{t("typedName")}</label>
          <input type="text" value={d.signature_name} placeholder={fullName({ legal_first: d.legal_first, legal_middle: d.legal_middle, legal_last: d.legal_last })} onChange={(e) => set({ signature_name: e.target.value })} />
          <label className="field">{t("signHere")}</label>
          <SignaturePad onChange={(v) => set({ signature_data: v })} />
        </>
      )}

      <div className="row between" style={{ marginTop: 24 }}>
        {idx > 0 ? (
          <button className="btn ghost" onClick={() => setIdx((i) => i - 1)}>← {t("back")}</button>
        ) : (
          <span />
        )}
        {step === "consent" ? (
          <button className="btn lg" disabled={!canSubmit || sending} onClick={submit}>
            {sending ? t("docsSending") : t("docsSubmit")} →
          </button>
        ) : (
          <button className="btn lg" disabled={!canNext} onClick={next}>
            {t("next")} →
          </button>
        )}
      </div>
    </main>
  );
}

function PhotoUploader({
  files,
  uploading,
  label,
  setLabel,
  onFile,
  t,
}: {
  files: DocumentFile[];
  uploading: boolean;
  label: string;
  setLabel: (s: string) => void;
  onFile: (f: File) => void;
  t: (k: string) => string;
}) {
  const [cam, setCam] = useState(false);
  return (
    <div>
      {files.length > 0 && (
        <div className="row" style={{ marginBottom: 10 }}>
          {files.map((f) => (
            <span className="tag" key={f.id}>📎 {f.label || f.storage_path.split("/").pop()}</span>
          ))}
        </div>
      )}
      <button className="btn secondary block" style={{ marginTop: 4 }} disabled={uploading} onClick={() => setCam(true)}>
        {uploading ? t("uploading") : `📷 ${t("addPhoto")}`}
      </button>
      <label className="field" style={{ marginTop: 12 }}>{t("photoLabelShort")}</label>
      <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("haveOther")} />
      {cam && (
        <CameraCapture
          t={t}
          onClose={() => setCam(false)}
          onCapture={(f) => {
            setCam(false);
            onFile(f);
          }}
        />
      )}
    </div>
  );
}
