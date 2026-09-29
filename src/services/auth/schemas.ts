import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Masukkan email yang valid."));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Masukkan kata sandi.").max(72, "Kata sandi terlalu panjang."),
});

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Masukkan nama lengkap.").max(80, "Nama terlalu panjang."),
  email,
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(72, "Kata sandi terlalu panjang."),
});

export type SignInValues = z.input<typeof signInSchema>;
export type SignUpValues = z.input<typeof signUpSchema>;

/**
 * Post-login redirect target. Only same-origin relative paths are allowed, so
 * a crafted `?next=` can't send a freshly signed-in user to another site.
 */
export function safeNextPath(next: unknown, fallback = "/"): string {
  if (typeof next !== "string" || next.length > 512) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
