"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/LangContext";
import { useSession } from "@/lib/useSession";
import LangSwitch from "./LangSwitch";
import Logo from "./Logo";

const STAFF = ["helper", "driver", "admin"];

export default function Header() {
  const { t } = useLang();
  const path = usePathname();
  const { profile } = useSession();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);
  if (path?.startsWith("/kiosk") || path === "/" || path?.startsWith("/language")) return null;
  const staff = !!profile && STAFF.includes(profile.role);
  const admin = profile?.role === "admin";
  const link = (href: string, label: string) => (
    <Link href={href} aria-current={path === href ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <header className="top">
      <div className="headinner">
        <Link href="/home" className="brand" aria-label={`${t("appName")} — ${t("home")}`}>
          <span className="logo">
            <Logo size={28} />
          </span>
          <span>{t("appName")}</span>
        </Link>
        <div className="topright">
          <LangSwitch compact />
          <button className="menubtn" aria-label={t("menu")} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? "✕" : "☰"}
          </button>
        </div>
        <nav className={open ? "open" : ""}>
          {link("/home", t("home"))}
          {link("/documents", t("docsTitle"))}
          {link("/jobs", t("jobs"))}
          {link("/helpers", t("helpers"))}
          {link("/donate", t("donateTitle"))}
          {link("/inbox", t("inbox"))}
          {staff && link("/navigator", t("navLink"))}
          {admin && link("/admin", "Admin")}
          {link("/account", t("account"))}
        </nav>
      </div>
    </header>
  );
}
