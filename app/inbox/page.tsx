"use client";

import { useLang } from "@/lib/LangContext";
import { useSession } from "@/lib/useSession";
import Inbox from "@/components/Inbox";
import PinLogin from "@/components/PinLogin";
import { PageSkeleton } from "@/components/Skeleton";

export default function InboxPage() {
  const { t } = useLang();
  const { user, loading } = useSession();
  if (loading) return <PageSkeleton cards={2} />;
  return (
    <main className="container">
      <h1>{t("inbox")}</h1>
      {user ? <Inbox userId={user.id} /> : <PinLogin />}
    </main>
  );
}
