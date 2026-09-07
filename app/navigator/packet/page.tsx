import { Suspense } from "react";
import Packet from "@/components/Packet";

export default function PacketPage() {
  return (
    <Suspense fallback={<main className="container" />}>
      <Packet />
    </Suspense>
  );
}
