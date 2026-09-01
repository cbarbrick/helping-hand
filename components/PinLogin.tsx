"use client";

import { useState } from "react";
import { useLang } from "@/lib/LangContext";
import { pinSignIn, pinSignUp, normalizeUsername } from "@/lib/pinAuth";
import { supabase } from "@/lib/supabase";

const ROLES = ["seeker", "helper", "employer", "driver"] as const;

export default function PinLogin({ compact = false, onDone }: { compact?: boolean; onDone?: () => void }) {
  const { t, lang } = useLang();
  const [mode, setMode] = useState<"signin" | "signup" | "email">("signin");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("seeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const errText = (code: string) => {
    const map: Record<string, string> = {
      username_taken: t("errTaken"),
      username_invalid: t("errUsername"),
      pin_invalid: t("errPin"),
      bad_login: t("errLogin"),
    };
    return map[code] ?? code;
  };

  async function go() {
    setBusy(true);
    setErr(null);
    setMsg(null);
    if (mode === "signin") {
      const { error } = await pinSignIn(username, pin);
      if (error) setErr(errText(error));
      else onDone?.();
    } else if (mode === "signup") {
      const { error } = await pinSignUp({ username, pin, display_name: name || username, role, language: lang });
      if (error) setErr(errText(error));
      else onDone?.();
    } else {
      const { error } = await supabase().auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
      else onDone?.();
    }
    setBusy(false);
  }

  const pinOk = /^\d{6}$/.test(pin);
  const userOk = normalizeUsername(username).length >= 3;

  return (
    <div className="card">
      {mode !== "email" && (
        <>
          {mode === "signup" && !compact && (
            <>
              <label className="field">{t("displayName")}</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
              <label className="field">{t("role")}</label>
              <div className="chips">
                {ROLES.map((r) => (
                  <button key={r} className={role === r ? "selected" : ""} onClick={() => setRole(r)}>
                    {t(`role_${r}`)}
                  </button>
                ))}
              </div>
            </>
          )}
          <label className="field">{t("username")}</label>
          <input
            type="text"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={t("usernameHint")}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
          />
          <label className="field">{t("pin")}</label>
          <input
            type="tel"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            style={{ fontSize: 28, letterSpacing: ".3em", textAlign: "center" }}
          />
          {mode === "signup" && <p className="hint">{t("pinHint")}</p>}
        </>
      )}
      {mode === "email" && (
        <>
          <label className="field">{t("email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="field">{t("password")}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </>
      )}
      {err && <p className="error">{err}</p>}
      {msg && <p className="success">{msg}</p>}
      <div className="stack" style={{ marginTop: 16 }}>
        <button
          className="btn block lg"
          onClick={go}
          disabled={busy || (mode === "email" ? !email || !password : !userOk || !pinOk)}
        >
          {busy ? t("saving") : mode === "signup" ? t("createAccount") : t("signIn")}
        </button>
        {mode === "signin" && (
          <button className="btn secondary block" onClick={() => setMode("signup")}>
            {t("needAccount")}
          </button>
        )}
        {mode === "signup" && (
          <button className="btn ghost" onClick={() => setMode("signin")}>
            {t("haveAccount")}
          </button>
        )}
        {!compact && (
          <button className="btn ghost small" onClick={() => setMode(mode === "email" ? "signin" : "email")}>
            {mode === "email" ? t("usePin") : t("useEmail")}
          </button>
        )}
      </div>
    </div>
  );
}
