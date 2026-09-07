"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { supabase } from "@/lib/supabase";
import { DOC_ICONS, DocumentStep, KioskLite, STATUS_ORDER, StepStatus } from "@/lib/documents";
import RideButton from "./RideButton";

// Timeline of every document in a person's case. Used on /documents and inside the kiosk inbox.
export default function DocStatus({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const { t, lang } = useLang();
  const [steps, setSteps] = useState<DocumentStep[] | null>(null);
  const [kiosks, setKiosks] = useState<Record<string, KioskLite>>({});

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const [{ data: s }, { data: k }] = await Promise.all([
        sb.from("document_steps").select("*").eq("user_id", userId).order("created_at"),
        sb.from("kiosks").select("id,name,code,address,area"),
      ]);
      setSteps((s as DocumentStep[]) ?? []);
      const map: Record<string, KioskLite> = {};
      for (const x of (k as KioskLite[]) ?? []) map[x.id] = x;
      setKiosks(map);
    })();
  }, [userId]);

  if (!steps) return null;
  if (steps.length === 0) return null;

  const pct = (s: StepStatus) => {
    const i = STATUS_ORDER.indexOf(s);
    return i < 0 ? 0 : Math.round(((i + 1) / STATUS_ORDER.length) * 100);
  };

  return (
    <div className="docsteps">
      {steps.map((s) => {
        const k = s.kiosk_id ? kiosks[s.kiosk_id] : null;
        const ready = s.status === "at_kiosk";
        return (
          <div className={`card ${ready ? "soft" : ""} ${s.status === "issue" ? "warm" : ""}`} key={s.id}>
            <div className="row between" style={{ flexWrap: "nowrap" }}>
              <div>
                <div className="small muted">{DOC_ICONS[s.doc_type]} {t(`doc_${s.doc_type}`)}</div>
                <div style={{ fontSize: compact ? 18 : 20, fontWeight: 800 }}>{t(`st_${s.status}`)}</div>
              </div>
              <span className={`tag ${s.status === "picked_up" ? "gray" : ready ? "warm" : ""}`}>{pct(s.status)}%</span>
            </div>
            {s.status !== "issue" && (
              <div className="progress" style={{ margin: "10px 0 6px" }}>
                <div style={{ width: `${pct(s.status)}%` }} />
              </div>
            )}
            {ready && (
              <div className="pickup-box">
                <div className="small muted">{t("pickupCode")}</div>
                <div className="pickup-code">{s.pickup_code}</div>
                {k && (
                  <div className="small">
                    {t("pickupAt")}: <strong>{k.name}</strong>
                    {k.address ? ` · ${k.address}` : ""}
                  </div>
                )}
              </div>
            )}
            {s.status === "appointment" && s.appointment_at && (
              <p className="small" style={{ margin: "6px 0 0" }}>
                📅 {t("appointmentAt")}: <strong>{new Date(s.appointment_at).toLocaleString(lang === "en" ? "en-US" : lang === "es" ? "es-US" : "fr-HT")}</strong>
                {k ? ` · ${k.name}` : ""}
              </p>
            )}
            {s.status === "appointment" && s.appointment_at && (
              <RideButton userId={userId} stepId={s.id} appointmentAt={s.appointment_at} destination={t(`rideDest_${s.doc_type}`)} pickupKioskId={s.kiosk_id ?? null} compact={compact} />
            )}
            {s.detail && <p className="small muted" style={{ margin: "6px 0 0" }}>{s.detail}</p>}
          </div>
        );
      })}
    </div>
  );
}
