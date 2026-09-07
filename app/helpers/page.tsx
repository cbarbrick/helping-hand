import { Suspense } from "react";
import HelpersList from "@/components/HelpersList";
import { PageSkeleton } from "@/components/Skeleton";

export default function HelpersPage() {
  return (
    <Suspense fallback={<PageSkeleton cards={2} />}>
      <HelpersList />
    </Suspense>
  );
}
