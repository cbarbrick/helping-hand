"use client";

import Link from "next/link";
import { useLang } from "@/lib/LangContext";
import LangSwitch from "@/components/LangSwitch";

export default function Home() {
  const { t } = useLang();
  return (
    <main className="container">
      <div style={{ margin: "10px 0 18px" }}>
        <LangSwitch />
      </div>
      <h1>{t("homeQuestion")}</h1>
      <p className="muted">{t("tagline")}</p>

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

      <div className="quick">
        <Link href="/jobs">
          <div className="icon">💼</div>
          <div className="title">{t("jobs")}</div>
          <div className="sub">{t("jobsSub")}</div>
        </Link>
        <Link href="/kiosk?code=NM-108">
          <div className="icon">🥫</div>
          <div className="title">{t("kiosk")}</div>
          <div className="sub">{t("kioskSub")}</div>
        </Link>
        <Link href="/helpers">
          <div className="icon">📍</div>
          <div className="title">{t("helpers")}</div>
          <div className="sub">{t("helpersSub")}</div>
        </Link>
      </div>

      <p className="emergency">{t("emergency")}</p>
    </main>
  );
}
