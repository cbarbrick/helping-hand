"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { supabase, Resource } from "@/lib/supabase";
import { ResourceCard } from "@/components/ResourceList";

const TOPICS: { need: string; icon: string }[] = [
  { need: "benefits", icon: "💳" },
  { need: "healthcare", icon: "🩺" },
  { need: "disability", icon: "♿" },
  { need: "housing", icon: "🏠" },
  { need: "documents", icon: "📑" },
  { need: "id", icon: "🪪" },
  { need: "ssn", icon: "📄" },
  { need: "food", icon: "🥫" },
  { need: "phone", icon: "📱" },
  { need: "addiction", icon: "💚" },
];

export default function ResourcesHub() {
  const { t } = useLang();
  const [need, setNeed] = useState<string>("benefits");
  const [all, setAll] = useState<Resource[]>([]);

  useEffect(() => {
    supabase()
      .from("resources")
      .select("*")
      .order("priority")
      .then(({ data }) => setAll((data as Resource[]) ?? []));
  }, []);

  const list = all.filter((r) => r.need === need);

  return (
    <main className="container">
      <h1>{t("hubTitle")}</h1>

      <div className="card soft">
        <h3>🧭 {t("hubWhatToBring")}</h3>
        <p className="small" style={{ margin: 0 }}>{t("hubWhatToBringBody")}</p>
      </div>

      <div className="chips">
        {TOPICS.map((x) => (
          <button key={x.need} className={need === x.need ? "selected" : ""} onClick={() => setNeed(x.need)}>
            <span className="icon">{x.icon}</span>
            {t(`need_${x.need}`)}
          </button>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {list.length === 0 ? <p className="small muted">{t("noResources")}</p> : list.map((r) => <ResourceCard key={r.id} r={r} />)}
      </div>
      <p className="emergency">{t("emergency")}</p>
    </main>
  );
}
