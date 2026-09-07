import { ImageResponse } from "next/og";
import { LOGO_PATH } from "@/components/Logo";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#2F6B4F" }}>
        <svg width={140} height={140} viewBox="420 380 414 520">
          <path fill="#ffffff" fillRule="evenodd" d={LOGO_PATH} />
        </svg>
      </div>
    ),
    size
  );
}
