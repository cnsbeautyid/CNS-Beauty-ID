"use client";

import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function RouteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col items-center justify-center px-6 py-section text-center"
    >
      <h1 className="text-h1">Terjadi kendala</h1>
      <p role="alert" className="mt-4 max-w-md text-body text-text-secondary">
        Maaf, halaman ini belum dapat dimuat. Silakan coba lagi dalam beberapa saat.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-6 py-3 text-body-s font-medium text-on-primary transition-opacity duration-(--duration-base) hover:opacity-90"
        >
          Coba lagi
        </button>
        <Link
          href={ROUTES.home}
          className="rounded-md border border-border px-6 py-3 text-body-s font-medium text-text-primary transition-colors duration-(--duration-base) hover:bg-surface"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
