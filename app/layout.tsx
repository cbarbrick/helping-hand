import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LangProvider } from "@/lib/LangContext";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "Helping Hand",
  description: "Real help, in your language, in your neighborhood. Housing, food, ID, jobs, healthcare, and a person nearby who can walk with you.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LangProvider>
          <Header />
          {children}
          <footer>Helping Hand · Miami-Dade · Inspired by one person, built for everyone.</footer>
        </LangProvider>
      </body>
    </html>
  );
}
