"use client";

import { useLang } from "@/lib/LangContext";
import { useSession } from "@/lib/useSession";
import Inbox from "@/components/Inbox";
import PinLogin from "@/components/PinLogin";

export default function InboxPage() {
  const { t } = useLang();
  const { user, loading } = useSession();
  if (loading) return <main className="container" />;
  return (
    <main className="container">
      <h1>{t("inbox")}</h1>
      <p className="muted">{t("inboxIntro")}</p>
      {user ? <Inbox userId={user.id} /> : <PinLogin />}
    </main>
  );
}
