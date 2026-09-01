import { Suspense } from "react";
import HelpersList from "@/components/HelpersList";

export default function HelpersPage() {
  return (
    <Suspense fallback={<main className="container" />}>
      <HelpersList />
    </Suspense>
  );
}
