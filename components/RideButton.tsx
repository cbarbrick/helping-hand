"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { supabase } from "@/lib/supabase";

export type Ride = {
  id: string;
  user_id: string;
  step_id: string | null;
  purpose: string | null;
  pickup_kiosk_id: string | null;
  pickup_text: string | null;
  destination: string;
  ride_at: string;
  status: string;
  driver_id: string | null;
  provider: string;
  notes: string | null;
};

export const RIDE_STATUS_KEY: Record<string, string> = {
  requested: "rideRequested",
  assigned: "rideAssigned",
  en_route: "rideEnRoute",
  picked_up: "ridePickedUp",
  done: "rideDone",
  cancelled: "rideCancelled",
  no_show: "rideNoShow",
};

/**
 * "Need a ride?" for an appointment. Creates a ride 45 minutes before the appointment,
 * picked up at the person's kiosk. Shows the ride's status once one exists.
 */
export default function RideButton({
  userId,
  stepId,
  appointmentAt,
  destination,
  pickupKioskId,
  compact = false,
}: {
  userId: string;
  stepId: string;
  appointmentAt: string;
  destination: string;
  pickupKioskId: string | null;
  compact?: boolean;
}) {
  const { t } = useLang();
  const [ride, setRide] = useState<Ride | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase()
      .from("rides")
      .select("*")
      .eq("step_id", stepId)
      .not("status", "in", "(cancelled,no_show)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setRide((data as Ride) ?? null));
  }, [stepId]);

  async function request() {
    setBusy(true);
    const rideAt = new Date(new Date(appointmentAt).getTime() - 45 * 60000).toISOString();
    const { data } = await supabase()
      .from("rides")
      .insert({ user_id: userId, step_id: stepId, purpose: "appointment", pickup_kiosk_id: pickupKioskId, destination, ride_at: rideAt })
      .select("*")
      .single();
    setRide((data as Ride) ?? null);
    setBusy(false);
  }

  async function cancel() {
    if (!ride) return;
    setBusy(true);
    await supabase().from("rides").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", ride.id);
    setRide(null);
    setBusy(false);
  }

  if (ride === undefined) return null;
  if (!ride)
    return (
      <button className={`btn ${compact ? "small" : ""}`} style={{ marginTop: 8 }} disabled={busy} onClick={request}>
        🚗 {t("rideRequest")}
      </button>
    );
  const when = new Date(ride.ride_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <div className="row" style={{ marginTop: 8, alignItems: "center", gap: 8 }}>
      <span className={`tag ${ride.status === "en_route" || ride.status === "assigned" ? "warm" : ""}`}>🚗 {t(RIDE_STATUS_KEY[ride.status] ?? ride.status)} · {when}</span>
      {["requested", "assigned"].includes(ride.status) && (
        <button className="btn ghost small" disabled={busy} onClick={cancel}>{t("rideCancel")}</button>
      )}
    </div>
  );
}
