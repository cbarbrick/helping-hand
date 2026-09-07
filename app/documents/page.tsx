import { Suspense } from "react";
import DocumentCenter from "@/components/DocumentCenter";
import { PageSkeleton } from "@/components/Skeleton";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<PageSkeleton cards={2} />}>
      <DocumentCenter />
    </Suspense>
  );
}
