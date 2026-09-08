"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { supabase } from "@/lib/supabase";
import { Ride, RIDE_STATUS_KEY } from "./RideButton";

type RideRow = Ride & { kiosks: { name: string; address: string | null } | null; profiles: { display_name: string | null } | null };

const NEXT: Record<string, { status: string; label: string }> = {
  requested: { status: "assigned", label: "rideMarkAssigned" },
  assigned: { status: "en_route", label: "rideMarkEnRoute" },
  en_route: { status: "picked_up", label: "rideMarkPickedUp" },
  picked_up: { status: "done", label: "rideMarkDone" },
};

/** Driver view of upcoming rides. */
export default function RidesList({ userId }: { userId: string }) {
  const { t } = useLang();
  const [rides, setRides] = useState<RideRow[]>([]);

  async function load() {
    const { data } = await supabase()
      .from("rides")
      .select("*,kiosks:pickup_kiosk_id(name,address),profiles:user_id(display_name)")
      .in("status", ["requested", "assigned", "en_route", "picked_up"])
      .order("ride_at");
    setRides((data as unknown as RideRow[]) ?? []);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, []);

  async function set(r: RideRow, status: string) {
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === "assigned" || (!r.driver_id && status !== "cancelled")) patch.driver_id = r.driver_id ?? userId;
    await supabase().from("rides").update(patch).eq("id", r.id);
    load();
  }

  return (
    <>
      <h2 style={{ marginTop: 32 }}>🚗 {t("rides")}</h2>
      {rides.length === 0 && <div className="card">{t("noOpen")}</div>}
      {rides.map((r) => {
        const n = NEXT[r.status];
        const when = new Date(r.ride_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
        const soon = new Date(r.ride_at).getTime() - Date.now() < 2 * 3600 * 1000;
        return (
          <div className="card" key={r.id}>
            <div className="row between">
              <h3>{when}</h3>
              <span className={`tag ${soon ? "warm" : ""}`}>{t(RIDE_STATUS_KEY[r.status] ?? r.status)}</span>
            </div>
            <div className="hint">{r.profiles?.display_name ?? "—"}{r.purpose ? ` · ${r.purpose}` : ""}</div>
            <p style={{ margin: "8px 0" }}>
              {t("rideFrom")}: <strong>{r.kiosks?.name ?? r.pickup_text ?? "—"}</strong>{r.kiosks?.address ? ` (${r.kiosks.address})` : ""}
              <br />
              {t("rideTo")}: <strong>{r.destination}</strong>
            </p>
            {r.notes && <p className="small muted">{r.notes}</p>}
            <div className="row">
              {n && <button className="btn" onClick={() => set(r, n.status)}>{t(n.label)} →</button>}
              {(r.status === "assigned" || r.status === "en_route") && <button className="btn ghost small" onClick={() => set(r, "no_show")}>{t("rideMarkNoShow")}</button>}
            </div>
          </div>
        );
      })}
    </>
  );
}
