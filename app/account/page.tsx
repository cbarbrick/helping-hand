"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { AREAS, NEEDS } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import PinLogin from "@/components/PinLogin";

const ROLES = ["seeker", "helper", "employer", "driver"] as const;

export default function AccountPage() {
  const { t, lang } = useLang();
  const { user, profile, loading, refresh } = useSession();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [phone, setPhone] = useState("");
  const [canMeet, setCanMeet] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [pRole, setPRole] = useState<string>("seeker");

  useEffect(() => {
    if (profile) {
      setArea(profile.area ?? "");
      setPhone(profile.phone ?? "");
      setCanMeet(profile.can_meet_in_person);
      setSkills(profile.helper_skills ?? []);
      setBio(profile.bio ?? "");
      setPRole(profile.role);
      setName(profile.display_name ?? "");
    }
  }, [profile]);

  async function saveProfile() {
    if (!user) return;
    setBusy(true);
    setErr(null);
    const { error } = await supabase()
      .from("profiles")
      .update({
        display_name: name,
        role: pRole,
        area: area || null,
        phone: phone || null,
        can_meet_in_person: canMeet,
        helper_skills: skills,
        bio: bio || null,
        language: lang,
      })
      .eq("id", user.id);
    if (error) setErr(error.message);
    else {
      setMsg(t("saved"));
      await refresh();
    }
    setBusy(false);
  }

  if (loading) return <main className="container" />;

  if (!user) {
    return (
      <main className="container">
        <h1>{t("signIn")}</h1>
        <p className="muted">{t("signInIntro")}</p>
        <PinLogin />
      </main>
    );
  }

  return (
    <main className="container">
      <div className="row between">
        <h1>{t("profile")}</h1>
        <button className="btn ghost" onClick={() => supabase().auth.signOut()}>
          {t("signOut")}
        </button>
      </div>
      {profile?.username && (
        <p className="muted">
          {t("username")}: <strong>{profile.username}</strong>
        </p>
      )}
      <div className="row" style={{ marginBottom: 12 }}>
        <Link className="btn secondary" href="/inbox">
          📬 {t("inbox")}
        </Link>
        {(pRole === "helper" || pRole === "admin") && (
          <Link className="btn secondary" href="/helpers/dashboard">
            {t("helperDash")}
          </Link>
        )}
        {(pRole === "driver" || pRole === "admin") && (
          <Link className="btn secondary" href="/driver">
            {t("driverDash")}
          </Link>
        )}
        {(pRole === "employer" || pRole === "admin") && (
          <Link className="btn secondary" href="/jobs/new">
            {t("postJob")}
          </Link>
        )}
      </div>
      <div className="card">
        <label className="field">{t("displayName")}</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="field">{t("role")}</label>
        <div className="chips">
          {ROLES.map((r) => (
            <button key={r} className={pRole === r ? "selected" : ""} onClick={() => setPRole(r)}>
              {t(`role_${r}`)}
            </button>
          ))}
        </div>
        <label className="field">{t("myArea")}</label>
        <select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">—</option>
          {AREAS.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <label className="field">
          {t("contactPhone")} <span className="muted small">({t("optional")})</span>
        </label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {pRole === "helper" && (
          <>
            <label className="check">
              <input type="checkbox" checked={canMeet} onChange={(e) => setCanMeet(e.target.checked)} />
              {t("canMeet")}
            </label>
            <label className="field">{t("helperSkills")}</label>
            <div className="chips">
              {NEEDS.map((n) => (
                <button
                  key={n}
                  className={skills.includes(n) ? "selected" : ""}
                  onClick={() => setSkills(skills.includes(n) ? skills.filter((x) => x !== n) : [...skills, n])}
                >
                  {t(`need_${n}`)}
                </button>
              ))}
            </div>
            <label className="field">{t("bio")}</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} />
          </>
        )}
        {err && <p className="error">{err}</p>}
        {msg && <p className="success">{msg}</p>}
        <button className="btn block" style={{ marginTop: 16 }} onClick={saveProfile} disabled={busy}>
          {t("save")}
        </button>
      </div>
    </main>
  );
}
