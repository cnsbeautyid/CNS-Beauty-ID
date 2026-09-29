/** wa.me link with a pre-filled message. `number` is digits only, e.g. "62812…". */
export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
