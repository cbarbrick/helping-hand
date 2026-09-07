import { Suspense } from "react";
import Packet from "@/components/Packet";
import { PageSkeleton } from "@/components/Skeleton";

export default function PacketPage() {
  return (
    <Suspense fallback={<PageSkeleton cards={2} />}>
      <Packet />
    </Suspense>
  );
}
