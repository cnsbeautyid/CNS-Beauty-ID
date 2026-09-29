import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { AuthShell } from "@/features/auth/auth-shell";
import { SignInForm } from "@/features/auth/sign-in-form";
import { getSessionUser } from "@/lib/auth/session";
import { safeNextPath } from "@/services/auth/schemas";

export const metadata: Metadata = {
  title: "Masuk",
  robots: { index: false, follow: false },
};

export default async function SignInPage({ searchParams }: PageProps<"/masuk">) {
  const params = await searchParams;
  const next = safeNextPath(params.next, ROUTES.home);
  if (await getSessionUser()) redirect(next);

  const notice = params.error === "link" ? "Tautan konfirmasi tidak valid atau sudah kedaluwarsa. Silakan masuk atau daftar ulang." : undefined;
  const signUpHref = `${ROUTES.signUp}?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title="Masuk"
      description={next === ROUTES.checkout ? "Masuk untuk melanjutkan checkout." : "Masuk ke akun CNS Beauty-mu."}
      footer={
        <>
          Belum punya akun?{" "}
          <Link href={signUpHref} className="font-medium text-text-primary underline underline-offset-4">
            Daftar sekarang
          </Link>
        </>
      }
    >
      <SignInForm next={next} notice={notice} />
    </AuthShell>
  );
}
