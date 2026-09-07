"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import { DOC_ICONS, DocumentCase, DocumentStep, KioskLite, caseNumber, fullName, wantedDocs } from "@/lib/documents";
import PinLogin from "@/components/PinLogin";
import { PageSkeleton } from "@/components/Skeleton";

type Filter = "open" | "kiosk" | "all";
const STAFF = ["helper", "driver", "admin"];

export default function NavigatorPage() {
  const { t, lang } = useLang();
  const { user, profile, loading } = useSession();
  const [cases, setCases] = useState<DocumentCase[]>([]);
  const [steps, setSteps] = useState<DocumentStep[]>([]);
  const [kiosks, setKiosks] = useState<Record<string, KioskLite>>({});
  const [filter, setFilter] = useState<Filter>("open");

  useEffect(() => {
    if (!profile || !STAFF.includes(profile.role)) return;
    (async () => {
      const sb = supabase();
      const [{ data: c }, { data: s }, { data: k }] = await Promise.all([
        sb.from("document_cases").select("*").not("signed_at", "is", null).neq("status", "closed").order("signed_at", { ascending: false }),
        sb.from("document_steps").select("*"),
        sb.from("kiosks").select("id,name,code,address,area"),
      ]);
      setCases((c as DocumentCase[]) ?? []);
      setSteps((s as DocumentStep[]) ?? []);
      const map: Record<string, KioskLite> = {};
      for (const x of (k as KioskLite[]) ?? []) map[x.id] = x;
      setKiosks(map);
    })();
  }, [profile]);

  if (loading) return <PageSkeleton cards={2} />;
  if (!user)
    return (
      <main className="container">
        <h1>{t("navTitle")}</h1>
        <p className="muted">{t("navOnly")}</p>
        <PinLogin />
      </main>
    );
  if (!profile || !STAFF.includes(profile.role))
    return (
      <main className="container">
        <h1>{t("navTitle")}</h1>
        <p className="muted">{t("navOnly")}</p>
      </main>
    );

  const stepsFor = (id: string) => steps.filter((s) => s.case_id === id);
  const needsAction = (id: string) => stepsFor(id).some((s) => ["ready", "issue", "at_warehouse", "collecting"].includes(s.status));
  const atKiosk = (id: string) => stepsFor(id).some((s) => s.status === "at_kiosk");
  const shown = cases.filter((c) => (filter === "open" ? needsAction(c.id) : filter === "kiosk" ? atKiosk(c.id) : true));

  return (
    <main className="container">
      <h1>{t("navTitle")}</h1>
      <p className="muted">{t("navIntro")}</p>
      <div className="chips" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {(["open", "kiosk", "all"] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? "selected" : ""} onClick={() => setFilter(f)}>
            {t(f === "open" ? "navFilterOpen" : f === "kiosk" ? "navFilterKiosk" : "navFilterAll")}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="muted" style={{ marginTop: 18 }}>{t("navNoCases")}</p>}
      {shown.map((c) => {
        const k = c.pickup_kiosk_id ? kiosks[c.pickup_kiosk_id] : null;
        return (
          <div className="card" key={c.id} style={{ marginTop: 14 }}>
            <div className="row between" style={{ flexWrap: "nowrap" }}>
              <div>
                <div className="small muted">{caseNumber(c.id)} · {t("navSubmittedOn")} {new Date(c.signed_at!).toLocaleDateString(lang === "es" ? "es-US" : "en-US")}</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{fullName(c) || c.signature_name}</div>
                <div className="small muted">
                  {k ? `📍 ${k.name}` : ""} {c.navigator_id ? (c.navigator_id === user.id ? "· 🙋 you" : "") : `· ${t("navUnassigned")}`}
                </div>
              </div>
              <Link className="btn" href={`/navigator/packet?id=${c.id}`}>{t("navOpen")}</Link>
            </div>
            <div style={{ marginTop: 8 }}>
              {wantedDocs(c).map((d) => {
                const s = stepsFor(c.id).find((x) => x.doc_type === d);
                return (
                  <span className={`tag ${s?.status === "at_kiosk" ? "warm" : s?.status === "picked_up" ? "gray" : ""}`} key={d}>
                    {DOC_ICONS[d]} {t(`doc_${d}`)}: {s ? t(`st_${s.status}`) : "—"}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </main>
  );
}
