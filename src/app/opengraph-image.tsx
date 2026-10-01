import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { BRAND } from "@/config/site";

export const alt = `${BRAND.name} — ${BRAND.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Default share card for pages without their own image (product pages keep
// their photo). Token colours: secondary, primary, AI accent, text secondary.
export default async function OpengraphImage() {
  const [font, logo] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/CormorantGaramond-SemiBold.ttf")),
    readFile(join(process.cwd(), "public/brand/cns-logo-mark.png")),
  ]);
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5F1EC",
          color: "#1F1F1F",
          fontFamily: "Cormorant Garamond",
        }}
      >
        { }
        <img src={logoSrc} width={150} height={140} alt="" />
        <div style={{ marginTop: 32, fontSize: 88, letterSpacing: 2 }}>{BRAND.name}</div>
        <div style={{ marginTop: 20, width: 120, height: 2, background: "#8C7A64" }} />
        <div style={{ marginTop: 24, fontSize: 40, color: "#6B6863" }}>{BRAND.tagline}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Cormorant Garamond", data: font, style: "normal", weight: 600 }] },
  );
}
