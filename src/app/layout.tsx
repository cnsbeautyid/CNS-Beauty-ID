import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";

import { clientEnv } from "@/lib/env/client";

import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "CNS Beauty Skincare",
    template: "%s | CNS Beauty",
  },
  description:
    "CNS Beauty — Your Skin. Your Ritual. Your Confidence. Perawatan kulit untuk ritual kecil mencintai diri sendiri setiap hari.",
  applicationName: "CNS Beauty",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main-content"
          className="sr-only rounded-md bg-primary px-4 py-2 text-body-s text-on-primary focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
        >
          Langsung ke konten utama
        </a>
        {children}
      </body>
    </html>
  );
}
