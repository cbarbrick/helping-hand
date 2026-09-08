"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/lib/useSession";
import RidesList from "@/components/RidesList";
import { PageSkeleton, Skeleton } from "@/components/Skeleton";

type Req = {
  id: string;
  pickup_code: string;
  status: string;
  items: Record<string, unknown>;
  requested_at: string;
  driver_id: string | null;
  kiosks: { name: string; address: string | null } | null;
};

const NEXT: Record<string, { status: string; label: string }> = {
  requested: { status: "packing", label: "markPacking" },
  packing: { status: "en_route", label: "markEnRoute" },
  en_route: { status: "delivered", label: "markDelivered" },
  delivered: { status: "picked_up", label: "markPickedUp" },
};

export default function DriverPage() {
  const { t } = useLang();
  const { user, loading } = useSession();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const { data } = await supabase()
      .from("supply_requests")
      .select("id,pickup_code,status,items,requested_at,driver_id,kiosks(name,address)")
      .in("status", ["requested", "packing", "en_route", "delivered"])
      .order("requested_at");
    setReqs((data as unknown as Req[]) ?? []);
    setLoaded(true);
  }

  useEffect(() => {
    if (!user) return;
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [user]);

  async function advance(r: Req) {
    const n = NEXT[r.status];
    if (!n || !user) return;
    const patch: Record<string, unknown> = { status: n.status, driver_id: r.driver_id ?? user.id };
    if (n.status === "delivered") patch.delivered_at = new Date().toISOString();
    if (n.status === "picked_up") patch.picked_up_at = new Date().toISOString();
    await supabase().from("supply_requests").update(patch).eq("id", r.id);
    load();
  }

  if (loading) return <PageSkeleton cards={2} wide />;
  if (!user)
    return (
      <main className="container">
        <h1>{t("driverDash")}</h1>
        <Link className="btn" href="/account">
          {t("signIn")}
        </Link>
      </main>
    );

  const describe = (items: Record<string, unknown>) => {
    const parts: string[] = [];
    if (items.food) parts.push(t("kioskFood"));
    if (items.hygiene) parts.push(t("kioskHygiene"));
    if (items.clothes && typeof items.clothes === "object") {
      const c = items.clothes as Record<string, string>;
      parts.push(`${t("kioskClothes")} (${[c.top, c.bottom, c.shoes].filter(Boolean).join(" / ")})`);
    }
    return parts.join(" · ");
  };

  return (
    <main className="container wide">
      <h1>{t("deliveries")}</h1>
      {!loaded && <Skeleton cards={2} heading={false} />}
      {loaded && reqs.length === 0 && <div className="card">{t("noOpen")}</div>}
      {reqs.map((r) => {
        const mins = Math.round((Date.now() - new Date(r.requested_at).getTime()) / 60000);
        const n = NEXT[r.status];
        return (
          <div className="card" key={r.id}>
            <div className="row between">
              <h3 className="mono">{r.pickup_code}</h3>
              <span className={`tag ${mins > 20 ? "warm" : ""}`}>{t("minutesAgo", { n: mins })}</span>
            </div>
            <div className="hint">
              {r.kiosks?.name} {r.kiosks?.address ? `· ${r.kiosks.address}` : ""}
            </div>
            <p style={{ margin: "8px 0" }}>{describe(r.items)}</p>
            <div className="row">
              <span className="tag">{t(`status_${r.status}`)}</span>
              {n && (
                <button className="btn" onClick={() => advance(r)}>
                  {t(n.label)} →
                </button>
              )}
            </div>
          </div>
        );
      })}
      <RidesList userId={user.id} />
    </main>
  );
}
