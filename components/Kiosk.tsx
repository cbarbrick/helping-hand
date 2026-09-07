"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import { supabase, pickupCode } from "@/lib/supabase";
import LangSwitch from "./LangSwitch";
import PinLogin from "./PinLogin";
import Inbox from "./Inbox";
import DocStatus from "./DocStatus";
import { useSession } from "@/lib/useSession";
import Logo from "./Logo";

type Screen = "home" | "order" | "code" | "status" | "inbox" | "docs";
type Status = { pickup_code: string; status: string; requested_at: string; target_minutes: number };

const STATUS_ORDER = ["requested", "packing", "en_route", "delivered"];

export default function Kiosk() {
  const { t, lang } = useLang();
  const params = useSearchParams();
  const code = params.get("code") ?? "NM-108";
  const intakeId = params.get("intake");
  const [screen, setScreen] = useState<Screen>(params.get("order") ? "order" : "home");
  const [kiosk, setKiosk] = useState<{ id: string; name: string; address: string | null } | null>(null);
  const [food, setFood] = useState(true);
  const [clothes, setClothes] = useState(false);
  const [hygiene, setHygiene] = useState(false);
  const [sizes, setSizes] = useState({ top: "", bottom: "", shoes: "" });
  const [pickup, setPickup] = useState<string | null>(null);
  const [lookup, setLookup] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user } = useSession();

  useEffect(() => {
    supabase()
      .from("kiosks")
      .select("id,name,address")
      .eq("code", code)
      .maybeSingle()
      .then(({ data }) => setKiosk(data));
  }, [code]);

  // Poll status while showing the code
  useEffect(() => {
    if (screen !== "code" || !pickup) return;
    const tick = async () => {
      const { data } = await supabase().rpc("supply_status", { p_code: pickup });
      if (data && data[0]) setStatus(data[0] as Status);
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [screen, pickup]);

  async function order() {
    setBusy(true);
    const pc = pickupCode();
    const { data: u } = await supabase().auth.getUser();
    const items: Record<string, unknown> = {};
    if (food) items.food = true;
    if (clothes) items.clothes = sizes;
    if (hygiene) items.hygiene = true;
    const { error } = await supabase().from("supply_requests").insert({
      kiosk_id: kiosk?.id ?? null,
      user_id: u.user?.id ?? null,
      intake_id: intakeId,
      pickup_code: pc,
      items,
    });
    if (!error) {
      setPickup(pc);
      setScreen("code");
    }
    setBusy(false);
  }

  async function check() {
    setNotFound(false);
    const { data } = await supabase().rpc("supply_status", { p_code: lookup.trim().toUpperCase() });
    if (data && data[0]) {
      setStatus(data[0] as Status);
      setPickup(data[0].pickup_code);
      setScreen("code");
    } else setNotFound(true);
  }

  const minutesLeft = status ? Math.max(0, status.target_minutes - Math.round((Date.now() - new Date(status.requested_at).getTime()) / 60000)) : 20;
  const stepIdx = status ? STATUS_ORDER.indexOf(status.status) : 0;

  return (
    <main className="container kiosk">
      <div className="row between" style={{ marginBottom: 10 }}>
        <div className="row" style={{ gap: 8 }}>
          <span className="logo-box"><Logo size={30} /></span>
          <strong>{t("appName")}</strong>
          <span className="tag gray">{kiosk?.name ?? code}</span>
        </div>
        <LangSwitch />
      </div>

      {screen === "home" && (
        <>
          <h1>{t("kioskTitle")}</h1>
          <p className="muted">{t("kioskQuestion")}</p>
          <div className="bigchoice">
            <button className="primary" onClick={() => setScreen("order")}>
              <div className="icon">🥫👕</div>
              <div className="title">{t("kioskYes")}</div>
              <div className="sub">{t("foodClothesNowSub")}</div>
            </button>
            <Link href={`/help?for=me&kiosk=${code}&lang=${lang}`} className="accent">
              <div className="icon">🙋</div>
              <div className="title">{t("kioskHelp")}</div>
              <div className="sub">{t("helpingMyselfSub")}</div>
            </Link>
            <Link href={`/resources?lang=${lang}`}>
              <div className="icon">🧭</div>
              <div className="title">{t("hubTitle")}</div>
              <div className="sub">{t("hubSub")}</div>
            </Link>
            <button onClick={() => setScreen("docs")}>
              <div className="icon">🪪</div>
              <div className="title">{t("docsHome")}</div>
              <div className="sub">{t("docsHomeSub")}</div>
            </button>
            <button onClick={() => setScreen("inbox")}>
              <div className="icon">📬</div>
              <div className="title">{t("kioskInbox")}</div>
              <div className="sub">{t("kioskInboxSub")}</div>
            </button>
            <button onClick={() => setScreen("status")}>
              <div className="icon">🔎</div>
              <div className="title">{t("kioskStatus")}</div>
            </button>
          </div>
          <p className="emergency">{t("emergency")}</p>
        </>
      )}

      {screen === "order" && (
        <>
          <h1>{t("kioskQuestion")}</h1>
          <div className="chips">
            <button className={food ? "selected" : ""} onClick={() => setFood(!food)}>
              <span className="icon">🥫</span>
              {t("kioskFood")}
            </button>
            <button className={clothes ? "selected" : ""} onClick={() => setClothes(!clothes)}>
              <span className="icon">👕</span>
              {t("kioskClothes")}
            </button>
            <button className={hygiene ? "selected" : ""} onClick={() => setHygiene(!hygiene)}>
              <span className="icon">🧼</span>
              {t("kioskHygiene")}
            </button>
          </div>
          {clothes && (
            <div className="card" style={{ marginTop: 14 }}>
              <label className="field">{t("sizeTop")}</label>
              <div className="chips">
                {["S", "M", "L", "XL", "2XL", "3XL"].map((s) => (
                  <button key={s} className={sizes.top === s ? "selected" : ""} onClick={() => setSizes({ ...sizes, top: s })}>
                    {s}
                  </button>
                ))}
              </div>
              <label className="field">{t("sizeBottom")}</label>
              <div className="chips">
                {["28", "30", "32", "34", "36", "38", "40", "42+"].map((s) => (
                  <button key={s} className={sizes.bottom === s ? "selected" : ""} onClick={() => setSizes({ ...sizes, bottom: s })}>
                    {s}
                  </button>
                ))}
              </div>
              <label className="field">{t("sizeShoes")}</label>
              <div className="chips">
                {["6", "7", "8", "9", "10", "11", "12", "13+"].map((s) => (
                  <button key={s} className={sizes.shoes === s ? "selected" : ""} onClick={() => setSizes({ ...sizes, shoes: s })}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="row between" style={{ marginTop: 24 }}>
            <button className="btn ghost" onClick={() => setScreen("home")}>
              ← {t("back")}
            </button>
            <button className="btn lg accent" onClick={order} disabled={busy || (!food && !clothes && !hygiene)}>
              {t("kioskPlace")} →
            </button>
          </div>
        </>
      )}

      {screen === "code" && pickup && (
        <>
          <h1>{t("kioskCode")}</h1>
          <div className="code">{pickup}</div>
          <p style={{ marginTop: 16 }}>{t("kioskArriving", { n: minutesLeft })}</p>
          <p className="muted">{t("kioskShowCode")}</p>
          <div className="status-steps">
            {STATUS_ORDER.map((s, i) => (
              <div key={s} className={i <= stepIdx ? "done" : ""}>
                {t(`status_${s}`)}
              </div>
            ))}
          </div>
          {status?.status === "picked_up" && <p className="success">{t("status_picked_up")}</p>}
          <button className="btn ghost" style={{ marginTop: 24 }} onClick={() => setScreen("home")}>
            ← {t("back")}
          </button>
        </>
      )}

      {screen === "inbox" && (
        <>
          <div className="row between">
            <h1>{t("inbox")}</h1>
            {user && (
              <button
                className="btn secondary"
                onClick={async () => {
                  await supabase().auth.signOut();
                  setScreen("home");
                }}
              >
                {t("doneSignOut")}
              </button>
            )}
          </div>
          {user ? (
            <>
              <p className="muted">{t("kioskInboxWarn")}</p>
              <Inbox userId={user.id} />
            </>
          ) : (
            <>
              <p className="muted">{t("signInIntro")}</p>
              <PinLogin compact />
            </>
          )}
          <button className="btn ghost" style={{ marginTop: 24 }} onClick={() => setScreen("home")}>
            ← {t("back")}
          </button>
        </>
      )}

      {screen === "docs" && (
        <>
          <div className="row between">
            <h1>{t("docsMine")}</h1>
            {user && (
              <button
                className="btn secondary"
                onClick={async () => {
                  await supabase().auth.signOut();
                  setScreen("home");
                }}
              >
                {t("doneSignOut")}
              </button>
            )}
          </div>
          {user ? (
            <>
              <p className="muted">{t("kioskInboxWarn")}</p>
              <DocStatus userId={user.id} compact />
              <Link className="btn block lg" style={{ marginTop: 16 }} href={`/documents?kiosk=${code}&lang=${lang}`}>
                🪪 {t("docsStart")}
              </Link>
            </>
          ) : (
            <>
              <p className="muted">{t("docsIntro")}</p>
              <p className="small">{t("signInIntro")}</p>
              <PinLogin compact />
            </>
          )}
          <button className="btn ghost" style={{ marginTop: 24 }} onClick={() => setScreen("home")}>
            ← {t("back")}
          </button>
        </>
      )}

      {screen === "status" && (
        <>
          <h1>{t("enterCode")}</h1>
          <input type="text" value={lookup} onChange={(e) => setLookup(e.target.value.toUpperCase())} maxLength={6} style={{ fontSize: 32, letterSpacing: ".2em", textAlign: "center" }} />
          {notFound && <p className="error">{t("notFound")}</p>}
          <div className="row between" style={{ marginTop: 20 }}>
            <button className="btn ghost" onClick={() => setScreen("home")}>
              ← {t("back")}
            </button>
            <button className="btn lg" onClick={check} disabled={lookup.length < 4}>
              {t("check")}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
