import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import PwaSetup from "@/components/PwaSetup";

export const metadata: Metadata = {
  title: "Helping Hand",
  description: "Housing, food, ID, jobs and healthcare help in North Miami, in your language.",
  manifest: "/manifest.webmanifest",
  applicationName: "Helping Hand",
  appleWebApp: { capable: true, title: "Helping Hand", statusBarStyle: "default" },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2F6B4F", viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LangProvider>
          <Header />
          {children}
          <SiteFooter />
          <PwaSetup />
        </LangProvider>
      </body>
    </html>
  );
}
