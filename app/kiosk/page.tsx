import { Suspense } from "react";
import Kiosk from "@/components/Kiosk";
import { Skeleton } from "@/components/Skeleton";

export default function KioskPage() {
  return (
    <Suspense
      fallback={
        <main className="container kiosk">
          <Skeleton cards={2} />
        </main>
      }
    >
      <Kiosk />
    </Suspense>
  );
}
