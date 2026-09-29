const idrFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const ratingFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Formats a backend-provided IDR amount for display. Never computes prices. */
export function formatIDR(amount: number): string {
  // Intl uses a non-breaking space after "Rp"; normalize for consistent output.
  return idrFormatter.format(amount).replace(/ /g, " ");
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
});

/** "1 Oktober 2026" in Jakarta time, regardless of server time zone. */
export function formatDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}

export function formatRating(value: number): string {
  return ratingFormatter.format(value);
}
