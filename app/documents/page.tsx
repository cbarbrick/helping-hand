import { Suspense } from "react";
import DocumentCenter from "@/components/DocumentCenter";

export default function DocumentsPage() {
  return (
    <Suspense fallback={<main className="container" />}>
      <DocumentCenter />
    </Suspense>
  );
}
