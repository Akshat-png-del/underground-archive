import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = "The Underground Archive — hard techno, industrial techno, schranz, EBM and darkwave";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(1200px 630px at 20% -10%, #241016 0%, #050505 55%, #050505 100%)",
          padding: "72px",
          color: "#f5f3f0",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 18,
              height: 18,
              background: "#e0431f",
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "#c9c4bd",
            }}
          >
            {siteConfig.name}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 76, lineHeight: 1.05, fontWeight: 700, maxWidth: 960 }}>
            The definitive archive for underground electronic music
          </div>
          <div style={{ fontSize: 30, color: "#a8a29a", maxWidth: 900 }}>
            Hard Techno · Industrial Techno · Schranz · Acid · Hardgroove · EBM · Darkwave
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#8a857d", letterSpacing: 2 }}>
          Artist profiles · Verified sets · Genre guides
        </div>
      </div>
    ),
    { ...size },
  );
}
