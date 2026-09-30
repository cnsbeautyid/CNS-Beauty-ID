/** Supabase Auth error codes → customer-facing Indonesian messages. */
export function authErrorMessage(code: string | undefined): string {
  switch (code) {
    case "invalid_credentials":
      return "Email atau kata sandi salah.";
    case "email_not_confirmed":
      return "Email belum dikonfirmasi. Buka tautan konfirmasi yang kami kirim ke emailmu.";
    case "weak_password":
      return "Kata sandi terlalu lemah. Gunakan kombinasi huruf dan angka, minimal 8 karakter.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Terlalu banyak percobaan. Coba lagi dalam beberapa menit.";
    case "signup_disabled":
      return "Pendaftaran akun sedang ditutup. Hubungi tim kami melalui WhatsApp.";
    default:
      return "Terjadi kendala. Silakan coba lagi.";
  }
}
