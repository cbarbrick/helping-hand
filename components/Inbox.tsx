"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import { supabase } from "@/lib/supabase";

export type Message = {
  id: string;
  kind: string;
  subject: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

const KIND_ICON: Record<string, string> = { update: "🔔", housing: "🏠", job: "💼", match: "🤝", pickup: "🥫", system: "🌿" };

export default function Inbox({ userId }: { userId: string }) {
  const { t } = useLang();
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase().from("messages").select("*").eq("to_user", userId).order("created_at", { ascending: false }).limit(100);
    setMsgs((data as Message[]) ?? []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function openMsg(m: Message) {
    setOpen(open === m.id ? null : m.id);
    if (!m.read_at) {
      await supabase().from("messages").update({ read_at: new Date().toISOString() }).eq("id", m.id);
      setMsgs(msgs.map((x) => (x.id === m.id ? { ...x, read_at: new Date().toISOString() } : x)));
    }
  }

  return (
    <div>
      {msgs.length === 0 && <div className="card">{t("inboxEmpty")}</div>}
      {msgs.map((m) => (
        <div className={`card msg ${m.read_at ? "" : "unread"}`} key={m.id} onClick={() => openMsg(m)}>
          <div className="row between">
            <h3>
              {KIND_ICON[m.kind] ?? "🔔"} {m.subject}
            </h3>
            {!m.read_at && <span className="tag">{t("new")}</span>}
          </div>
          <div className="hint">{new Date(m.created_at).toLocaleString()}</div>
          {open === m.id && (
            <div style={{ marginTop: 10 }}>
              {m.body && <p>{m.body}</p>}
              {m.link && (
                <Link className="btn secondary" href={m.link}>
                  {t("open")}
                </Link>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
