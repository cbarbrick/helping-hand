"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/LangContext";
import LangSwitch from "./LangSwitch";

export default function Header() {
  const { t } = useLang();
  const path = usePathname();
  if (path?.startsWith("/kiosk")) return null;
  return (
    <header className="top">
      <Link href="/" className="brand">
        <span className="logo">🤝</span>
        <span>{t("appName")}</span>
      </Link>
      <nav>
        <Link href="/jobs">{t("jobs")}</Link>
        <Link href="/helpers">{t("helpers")}</Link>
        <Link href="/inbox">{t("inbox")}</Link>
        <Link href="/account">{t("account")}</Link>
        <LangSwitch compact />
      </nav>
    </header>
  );
}
