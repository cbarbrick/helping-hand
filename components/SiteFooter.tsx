"use client";

import { usePathname } from "next/navigation";

/**
 * The one-line footer. Hidden on the full-screen front page and on kiosk
 * screens, where it would otherwise add a stray scroll below the fold.
 */
export default function SiteFooter() {
  const path = usePathname();
  if (path === "/" || path?.startsWith("/kiosk")) return null;
  return <footer className="site">Inspired by one person, built for everyone.</footer>;
}
