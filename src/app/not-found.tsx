import type { Metadata } from "next";
import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center px-6 py-section text-center"
    >
      <p className="text-caption tracking-eyebrow text-text-secondary uppercase">404</p>
      <h1 className="mt-4 text-h1">Halaman tidak ditemukan</h1>
      <p className="mt-4 max-w-md text-body text-text-secondary">
        Halaman yang kamu cari mungkin sudah dipindahkan atau tidak tersedia.
      </p>
      <Link
        href={ROUTES.home}
        className="mt-8 rounded-md bg-primary px-6 py-3 text-body-s font-medium text-on-primary transition-opacity duration-(--duration-base) hover:opacity-90"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
