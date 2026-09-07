import { Suspense } from "react";
import HelpFlow from "@/components/HelpFlow";
import { PageSkeleton } from "@/components/Skeleton";

export default function HelpPage() {
  return (
    <Suspense fallback={<PageSkeleton cards={1} />}>
      <HelpFlow />
    </Suspense>
  );
}
