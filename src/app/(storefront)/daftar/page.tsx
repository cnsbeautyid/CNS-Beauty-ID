import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ROUTES } from "@/constants/routes";
import { AuthShell } from "@/features/auth/auth-shell";
import { SignUpForm } from "@/features/auth/sign-up-form";
import { getSessionUser } from "@/lib/auth/session";
import { safeNextPath } from "@/services/auth/schemas";

export const metadata: Metadata = {
  title: "Daftar",
  robots: { index: false, follow: false },
};

export default async function SignUpPage({ searchParams }: PageProps<"/daftar">) {
  const params = await searchParams;
  const next = safeNextPath(params.next, ROUTES.home);
  if (await getSessionUser()) redirect(next);

  return (
    <AuthShell
      title="Daftar"
      description="Buat akun untuk checkout dan memantau pesananmu."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href={`${ROUTES.signIn}?next=${encodeURIComponent(next)}`} className="font-medium text-text-primary underline underline-offset-4">
            Masuk
          </Link>
        </>
      }
    >
      <SignUpForm next={next} />
    </AuthShell>
  );
}
