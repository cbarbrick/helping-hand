"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * De-identified report for partners (Homeless Trust, funders).
 * Reads only aggregate-safe columns, never names, contact details, photos or signatures.
 */
type IntakeRow = {
  id: string;
  created_at: string;
  status: string;
  area: string | null;
  language: string | null;
  household_type: string | null;
  adults: number | null;
  children: number | null;
  on_behalf_of: boolean | null;
  has_id: boolean | null;
  has_ssn: boolean | null;
  has_phone: boolean | null;
  has_place_to_sleep: boolean | null;
  in_danger: boolean | null;
  veteran: boolean | null;
  has_disability: boolean | null;
  wants_recovery: boolean | null;
  needs: string[] | null;
  first_name: string | null;
  kiosk_id: string | null;
};
type StepRow = { doc_type: string; status: string; created_at: string; case_id: string };
type SupplyRow = { status: string; requested_at: string; delivered_at: string | null };
type ResourceRow = { need: string };

const NEED_LABEL: Record<string, string> = {
  housing: "Housing", id: "ID", ssn: "Social Security card", documents: "Documents", food: "Food", clothes: "Clothes", job: "Job",
  healthcare: "Healthcare", benefits: "Benefits (SNAP / Medicaid / cash)", disability: "Disability", addiction: "Recovery", phone: "Phone",
};
const DOC_LABEL: Record<string, string> = { ssn_card: "Social Security card", birth_cert: "Birth certificate", fl_id: "Florida ID", benefits: "SNAP / Medicaid" };

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) + "%" : "0%";
}

export default function TrustReport() {
  const [intakes, setIntakes] = useState<IntakeRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [supply, setSupply] = useState<SupplyRow[]>([]);
  const [resources, setResources] = useState<ResourceRow[]>([]);
  const [jobs, setJobs] = useState(0);
  const [matches, setMatches] = useState(0);
  const [includeDemo, setIncludeDemo] = useState(false);
  const [days, setDays] = useState(30);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const sb = supabase();
    Promise.all([
      sb.from("intakes").select("id,created_at,status,area,language,household_type,adults,children,on_behalf_of,has_id,has_ssn,has_phone,has_place_to_sleep,in_danger,veteran,has_disability,wants_recovery,needs,first_name,kiosk_id"),
      sb.from("document_steps").select("doc_type,status,created_at,case_id"),
      sb.from("supply_requests").select("status,requested_at,delivered_at"),
      sb.from("resources").select("need"),
      sb.from("jobs").select("id", { count: "exact", head: true }).eq("active", true),
      sb.from("matches").select("id", { count: "exact", head: true }),
    ]).then(([i, s, p, r, j, m]) => {
      setIntakes((i.data as IntakeRow[]) ?? []);
      setSteps((s.data as StepRow[]) ?? []);
      setSupply((p.data as SupplyRow[]) ?? []);
      setResources((r.data as ResourceRow[]) ?? []);
      setJobs(j.count ?? 0);
      setMatches(m.count ?? 0);
    });
  }, []);

  const since = useMemo(() => Date.now() - days * 86400000, [days]);
  const isDemo = (r: { first_name?: string | null }) => (r.first_name ?? "").toUpperCase().startsWith("DEMO");

  const rows = useMemo(
    () => intakes.filter((r) => new Date(r.created_at).getTime() >= since && (includeDemo || !isDemo(r))),
    [intakes, since, includeDemo]
  );
  const stepRows = useMemo(() => steps.filter((s) => new Date(s.created_at).getTime() >= since), [steps, since]);
  const supplyRows = useMemo(() => supply.filter((s) => new Date(s.requested_at).getTime() >= since), [supply, since]);

  const stats = useMemo(() => {
    const n = rows.length;
    const needCounts: Record<string, number> = {};
    let linked = 0;
    const resByNeed: Record<string, number> = {};
    resources.forEach((r) => (resByNeed[r.need] = (resByNeed[r.need] ?? 0) + 1));
    rows.forEach((r) => (r.needs ?? []).forEach((k) => { needCounts[k] = (needCounts[k] ?? 0) + 1; linked += resByNeed[k] ?? 0; }));
    const areaCounts: Record<string, number> = {};
    rows.forEach((r) => { const a = r.area || "Not given"; areaCounts[a] = (areaCounts[a] ?? 0) + 1; });
    const langCounts: Record<string, number> = {};
    rows.forEach((r) => { const l = r.language || "en"; langCounts[l] = (langCounts[l] ?? 0) + 1; });
    const docReq: Record<string, number> = {};
    const docDone: Record<string, number> = {};
    stepRows.forEach((s) => { docReq[s.doc_type] = (docReq[s.doc_type] ?? 0) + 1; if (s.status === "picked_up" || s.status === "at_kiosk") docDone[s.doc_type] = (docDone[s.doc_type] ?? 0) + 1; });
    const delivered = supplyRows.filter((s) => s.delivered_at).length;
    const mins = supplyRows.filter((s) => s.delivered_at).map((s) => (new Date(s.delivered_at!).getTime() - new Date(s.requested_at).getTime()) / 60000);
    const avgMin = mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : null;
    return {
      n,
      unsheltered: rows.filter((r) => r.has_place_to_sleep === false).length,
      noPhone: rows.filter((r) => r.has_phone === false).length,
      noId: rows.filter((r) => r.has_id === false).length,
      families: rows.filter((r) => r.household_type === "family").length,
      children: rows.reduce((a, r) => a + (r.children ?? 0), 0),
      veterans: rows.filter((r) => r.veteran).length,
      disability: rows.filter((r) => r.has_disability).length,
      recovery: rows.filter((r) => r.wants_recovery).length,
      danger: rows.filter((r) => r.in_danger).length,
      helped: rows.filter((r) => r.on_behalf_of).length,
      kiosk: rows.filter((r) => r.kiosk_id).length,
      needCounts, linked, areaCounts, langCounts, docReq, docDone,
      cases: new Set(stepRows.map((s) => s.case_id)).size,
      pickups: supplyRows.length, delivered, avgMin,
    };
  }, [rows, stepRows, supplyRows, resources]);

  const summaryText = () => {
    const lines = [
      `Helping Hand, de-identified summary, last ${days} days (generated ${new Date().toLocaleDateString()})`,
      `Cases opened: ${stats.n} (${stats.helped} entered by a helper on someone's behalf, ${stats.kiosk} at a kiosk)`,
      `Unsheltered tonight: ${stats.unsheltered} (${pct(stats.unsheltered, stats.n)}). No phone: ${stats.noPhone}. No ID: ${stats.noId}.`,
      `Families: ${stats.families} with ${stats.children} children. Veterans: ${stats.veterans}. Disability: ${stats.disability}. Wants recovery: ${stats.recovery}. In immediate danger: ${stats.danger}.`,
      `Needs flagged: ` + Object.entries(stats.needCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${NEED_LABEL[k] ?? k} ${v}`).join(", "),
      `Resources linked in help plans: ${stats.linked}`,
      `Areas: ` + Object.entries(stats.areaCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", "),
      `Languages: ` + Object.entries(stats.langCounts).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(", "),
      `Document packets: ${stats.cases}. Documents requested: ` + Object.entries(stats.docReq).map(([k, v]) => `${DOC_LABEL[k] ?? k} ${v}${stats.docDone[k] ? ` (${stats.docDone[k]} at kiosk or picked up)` : ""}`).join(", "),
      `Kiosk orders: ${stats.pickups}, delivered ${stats.delivered}${stats.avgMin != null ? `, average ${stats.avgMin} minutes` : ""}`,
      `Active jobs on the board: ${jobs}. Helper matches: ${matches}.`,
      `No names, contact details, photos or signatures are included.`,
    ];
    return lines.join("\n");
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(summaryText()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const downloadCsv = () => {
    const head = ["date", "area", "language", "household", "adults", "children", "entered_by_helper", "at_kiosk", "has_id", "has_ssn", "has_phone", "place_to_sleep_tonight", "in_danger", "veteran", "disability", "wants_recovery", "needs", "status"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const body = rows.map((r) => [
      r.created_at.slice(0, 10), r.area, r.language, r.household_type, r.adults, r.children, !!r.on_behalf_of, !!r.kiosk_id, r.has_id, r.has_ssn, r.has_phone, r.has_place_to_sleep, r.in_danger, r.veteran, r.has_disability, r.wants_recovery, (r.needs ?? []).join("|"), r.status,
    ].map(esc).join(","));
    const csv = [head.join(","), ...body].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `helping-hand-deidentified-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const Tile = ({ n, label }: { n: number | string; label: string }) => (
    <div className="card soft" style={{ textAlign: "center", padding: "12px 8px", minWidth: 110, flex: 1 }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: "var(--brand)" }}>{n}</div>
      <div className="small muted">{label}</div>
    </div>
  );

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="row between" style={{ alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>📊 Report for partners (de-identified)</h3>
        <div className="row" style={{ gap: 8 }}>
          {[30, 60, 90, 365].map((d) => (
            <button key={d} className={`btn secondary small ${days === d ? "selected" : ""}`} onClick={() => setDays(d)}>{d === 365 ? "1 year" : `${d} days`}</button>
          ))}
        </div>
      </div>
      <label className="check" style={{ marginTop: 8 }}>
        <input type="checkbox" checked={includeDemo} onChange={(e) => setIncludeDemo(e.target.checked)} />
        <span className="small">Include DEMO records (off for anything you send to a partner)</span>
      </label>

      <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <Tile n={stats.n} label="cases opened" />
        <Tile n={stats.unsheltered} label="unsheltered tonight" />
        <Tile n={stats.noPhone} label="no phone" />
        <Tile n={stats.noId} label="no ID" />
        <Tile n={stats.linked} label="resources linked" />
        <Tile n={stats.cases} label="document packets" />
        <Tile n={stats.pickups} label="kiosk orders" />
      </div>

      <div className="row" style={{ gap: 20, marginTop: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="field">Needs flagged</div>
          {Object.entries(stats.needCounts).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} className="row between small" style={{ padding: "3px 0" }}><span>{NEED_LABEL[k] ?? k}</span><span>{v} ({pct(v, stats.n)})</span></div>
          ))}
          {stats.n === 0 && <div className="small muted">No cases in this window.</div>}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="field">Who</div>
          {[["Entered by a helper", stats.helped], ["At a kiosk", stats.kiosk], ["Families", stats.families], ["Children", stats.children], ["Veterans", stats.veterans], ["Disability", stats.disability], ["Wants recovery", stats.recovery], ["In immediate danger", stats.danger]].map(([l, v]) => (
            <div key={String(l)} className="row between small" style={{ padding: "3px 0" }}><span>{l}</span><span>{v}</span></div>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="field">Documents</div>
          {Object.entries(stats.docReq).map(([k, v]) => (
            <div key={k} className="row between small" style={{ padding: "3px 0" }}><span>{DOC_LABEL[k] ?? k}</span><span>{v} requested{stats.docDone[k] ? `, ${stats.docDone[k]} delivered` : ""}</span></div>
          ))}
          <div className="field" style={{ marginTop: 10 }}>Kiosk</div>
          <div className="row between small" style={{ padding: "3px 0" }}><span>Orders delivered</span><span>{stats.delivered} of {stats.pickups}{stats.avgMin != null ? `, avg ${stats.avgMin} min` : ""}</span></div>
          <div className="row between small" style={{ padding: "3px 0" }}><span>Active jobs</span><span>{jobs}</span></div>
          <div className="row between small" style={{ padding: "3px 0" }}><span>Helper matches</span><span>{matches}</span></div>
        </div>
      </div>

      <div className="row" style={{ gap: 10, marginTop: 14 }}>
        <button className="btn" onClick={copy}>{copied ? "Copied" : "Copy summary"}</button>
        <button className="btn secondary" onClick={downloadCsv}>Download CSV (no names)</button>
      </div>
    </div>
  );
}
