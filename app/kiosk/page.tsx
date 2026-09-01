import { Suspense } from "react";
import Kiosk from "@/components/Kiosk";

export default function KioskPage() {
  return (
    <Suspense fallback={<main className="container kiosk" />}>
      <Kiosk />
    </Suspense>
  );
}
