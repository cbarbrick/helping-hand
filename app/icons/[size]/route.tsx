import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { LOGO_PATH } from "@/components/Logo";

export const runtime = "edge";

const SIZES: Record<string, number> = { "192": 192, "512": 512 };

export async function GET(req: NextRequest, ctx: { params: Promise<{ size: string }> }) {
  const { size } = await ctx.params;
  const px = SIZES[size] ?? 512;
  const maskable = req.nextUrl.searchParams.get("maskable") === "1";
  const pad = maskable ? px * 0.2 : px * 0.12;
  const radius = maskable ? 0 : px * 0.22;
  return new ImageResponse(
    (
      <div
        style={{
          width: px,
          height: px,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2F6B4F",
          borderRadius: radius,
        }}
      >
        <svg width={px - pad * 2} height={px - pad * 2} viewBox="420 380 414 520">
          <path fill="#ffffff" fillRule="evenodd" d={LOGO_PATH} />
        </svg>
      </div>
    ),
    { width: px, height: px }
  );
}
