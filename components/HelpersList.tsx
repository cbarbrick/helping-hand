"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { AREAS } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";

type PublicHelper = {
  id: string;
  display_name: string | null;
  area: string | null;
  helper_skills: string[] | null;
  bio: string | null;
};

export default function HelpersList() {
  const { t } = useLang();
  const params = useSearchParams();
  const intakeId = params.get("intake");
  const [area, setArea] = useState(params.get("area") ?? "");
  const [helpers, setHelpers] = useState<PublicHelper[]>([]);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let q = supabase().from("public_helpers").select("*");
    if (area) q = q.eq("area", area);
    q.then(({ data }) => {
      setHelpers((data as PublicHelper[]) ?? []);
      setLoaded(true);
    });
  }, [area]);

  async function requestMatch(helperId: string) {
    if (!intakeId) return;
    const { error } = await supabase().from("matches").insert({ intake_id: intakeId, helper_id: helperId, meet_area: area || null });
    if (!error) setSent({ ...sent, [helperId]: true });
  }

  return (
    <main className="container">
      <h1>{t("helpersTitle")}</h1>
      <p className="muted">{t("helpersIntro")}</p>
      <select value={area} onChange={(e) => setArea(e.target.value)}>
        <option value="">{t("allAreas")}</option>
        {AREAS.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>

      <div style={{ marginTop: 14 }}>
        {loaded && helpers.length === 0 && <div className="card">{t("noHelpers")}</div>}
        {helpers.map((h) => (
          <div className="card" key={h.id}>
            <h3>{h.display_name ?? "Helper"}</h3>
            <div className="hint">{h.area}</div>
            {h.bio && <p className="small" style={{ marginTop: 6 }}>{h.bio}</p>}
            <div>
              {(h.helper_skills ?? []).map((s) => (
                <span className="tag" key={s}>
                  {t(`need_${s}`)}
                </span>
              ))}
            </div>
            {intakeId && (
              <div style={{ marginTop: 12 }}>
                {sent[h.id] ? (
                  <p className="success">{t("matchSent")}</p>
                ) : (
                  <button className="btn" onClick={() => requestMatch(h.id)}>
                    {t("requestMatch")}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 20 }}>
        <Link className="btn secondary" href="/account">
          {t("becomeHelper")}
        </Link>
        <Link className="btn ghost" href="/helpers/dashboard">
          {t("helperDash")}
        </Link>
      </div>
    </main>
  );
}
