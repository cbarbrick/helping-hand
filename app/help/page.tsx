import { Suspense } from "react";
import HelpFlow from "@/components/HelpFlow";

export default function HelpPage() {
  return (
    <Suspense fallback={<main className="container" />}>
      <HelpFlow />
    </Suspense>
  );
}
