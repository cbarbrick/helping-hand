"use client";

import Link from "next/link";
import { useLang } from "@/lib/LangContext";

export default function Home() {
  const { t } = useLang();
  return (
    <main className="container">
      <h1>{t("homeQuestion")}</h1>

      <div className="bigchoice two">
        <Link href="/help?for=someone" className="primary">
          <div className="icon">🤝</div>
          <div className="title">{t("helpingSomeone")}</div>
          <div className="sub">{t("helpingSomeoneSub")}</div>
        </Link>
        <Link href="/help?for=me" className="accent">
          <div className="icon">🙋</div>
          <div className="title">{t("helpingMyself")}</div>
          <div className="sub">{t("helpingMyselfSub")}</div>
        </Link>
      </div>

      <div className="bigchoice inline">
        <Link href="/documents">
          <div className="icon">🪪</div>
          <div>
            <div className="title">{t("docsHome")}</div>
            <div className="sub">{t("docsHomeShort")}</div>
          </div>
        </Link>
      </div>

      <div className="quick four">
        <Link href="/resources">
          <div className="icon">🧭</div>
          <div className="title">{t("benefitsShort")}</div>
        </Link>
        <Link href="/jobs">
          <div className="icon">💼</div>
          <div className="title">{t("jobs")}</div>
        </Link>
        <Link href="/kiosk?code=NM-108">
          <div className="icon">🥫</div>
          <div className="title">{t("kiosk")}</div>
        </Link>
        <Link href="/helpers">
          <div className="icon">📍</div>
          <div className="title">{t("helpers")}</div>
        </Link>
      </div>

      <p className="emergency">{t("emergency")}</p>
    </main>
  );
}
