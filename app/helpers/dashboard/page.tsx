"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { AREAS } from "@/lib/i18n";
import { supabase, Intake } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";

type MatchRow = { id: string; intake_id: string; status: string; helper_id: string | null };

export default function HelperDashboard() {
  const { t } = useLang();
  const { user, profile, loading } = useSession();
  const [area, setArea] = useState<string>("");
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);

  useEffect(() => {
    if (profile?.area && !area) setArea(profile.area);
  }, [profile, area]);

  useEffect(() => {
    if (!user) return;
    let q = supabase().from("intakes").select("*").in("status", ["open", "matched"]).order("created_at", { ascending: false }).limit(50);
    if (area) q = q.eq("area", area);
    q.then(({ data }) => setIntakes((data as Intake[]) ?? []));
    supabase()
      .from("matches")
      .select("id,intake_id,status,helper_id")
      .eq("helper_id", user.id)
      .then(({ data }) => setMatches((data as MatchRow[]) ?? []));
  }, [user, area]);

  async function accept(intake: Intake) {
    if (!user) return;
    const existing = matches.find((m) => m.intake_id === intake.id);
    if (existing) {
      await supabase().from("matches").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase().from("matches").insert({ intake_id: intake.id, helper_id: user.id, status: "accepted", meet_area: intake.area });
    }
    await supabase().from("intakes").update({ status: "matched" }).eq("id", intake.id);
    const { data } = await supabase().from("matches").select("id,intake_id,status,helper_id").eq("helper_id", user.id);
    setMatches((data as MatchRow[]) ?? []);
  }

  if (loading) return <main className="container" />;
  if (!user)
    return (
      <main className="container">
        <h1>{t("helperDash")}</h1>
        <Link className="btn" href="/account">
          {t("signIn")}
        </Link>
      </main>
    );

  const mine = (id: string) => matches.find((m) => m.intake_id === id && m.status === "accepted");

  return (
    <main className="container wide">
      <h1>{t("openRequests")}</h1>
      <select value={area} onChange={(e) => setArea(e.target.value)}>
        <option value="">{t("allAreas")}</option>
        {AREAS.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
      <div style={{ marginTop: 14 }}>
        {intakes.length === 0 && <div className="card">{t("noOpen")}</div>}
        {intakes.map((i) => (
          <div className="card" key={i.id}>
            <div className="row between">
              <h3>
                {i.first_name ?? "—"} <span className="muted small">HH-{i.id.slice(0, 6).toUpperCase()}</span>
              </h3>
              <span className={`tag ${i.status === "matched" ? "" : "warm"}`}>{i.status}</span>
            </div>
            <div className="hint">
              {i.area ?? "?"} {i.sleep_area ? `· ${i.sleep_area}` : ""} · {new Date(i.created_at).toLocaleDateString()}
              {i.on_behalf_of ? " · via a helper" : ""}
            </div>
            <div>
              {i.needs.map((n) => (
                <span className="tag" key={n}>
                  {t(`need_${n}`)}
                </span>
              ))}
              {i.household_type === "family" && (
                <span className="tag warm">
                  👨‍👩‍👧 {i.adults ?? 1} adults · {i.children ?? 0} children{i.children_ages ? ` (${i.children_ages})` : ""}
                </span>
              )}
              {i.pregnant && <span className="tag warm">pregnant</span>}
              {i.veteran && <span className="tag">veteran</span>}
              {i.in_danger && <span className="tag warm">safety concern</span>}
              {i.registrant_name && <span className="tag gray">via {i.registrant_name} ({i.registrant_relationship})</span>}
              {i.has_place_to_sleep === false && <span className="tag warm">no place to sleep</span>}
              {i.has_id === false && <span className="tag gray">no ID</span>}
              {i.has_phone === false && <span className="tag gray">no phone</span>}
            </div>
            {i.notes && <p className="small" style={{ marginTop: 8 }}>{i.notes}</p>}
            <div style={{ marginTop: 12 }}>
              {mine(i.id) ? (
                <>
                  <p className="success">{t("accepted")}</p>
                  <div className="card soft" style={{ marginBottom: 0 }}>
                    <strong>{i.contact ?? "No contact given. Look for them in the area above."}</strong>
                  </div>
                </>
              ) : (
                <button className="btn" onClick={() => accept(i)}>
                  {t("accept")}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
