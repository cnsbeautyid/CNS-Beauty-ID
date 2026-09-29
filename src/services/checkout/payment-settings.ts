import { z } from "zod";

// Manual bank-transfer instructions from the public settings.payment row. The
// owner maintains the accounts in the dashboard; the storefront never invents
// payment details, and invalid entries are dropped rather than shown.

const accountSchema = z.object({
  bank: z.string().trim().min(1).max(60),
  account_number: z.string().trim().regex(/^[0-9 .-]{4,30}$/),
  account_name: z.string().trim().min(1).max(80),
});

const settingsSchema = z.object({
  expiry_hours: z.number().int().min(1).max(168).catch(24),
  bank_accounts: z.array(z.unknown()).catch([]),
  note: z.string().trim().max(500).nullable().optional().catch(null),
});

export type BankAccount = { bank: string; accountNumber: string; accountName: string };
export type PaymentSettings = { expiryHours: number; bankAccounts: BankAccount[]; note?: string };

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = { expiryHours: 24, bankAccounts: [] };

export function parsePaymentSettings(raw: unknown): PaymentSettings {
  const parsed = settingsSchema.safeParse(raw ?? {});
  if (!parsed.success) return DEFAULT_PAYMENT_SETTINGS;
  const bankAccounts = parsed.data.bank_accounts.flatMap((entry) => {
    const account = accountSchema.safeParse(entry);
    return account.success
      ? [{ bank: account.data.bank, accountNumber: account.data.account_number, accountName: account.data.account_name }]
      : [];
  });
  return { expiryHours: parsed.data.expiry_hours, bankAccounts, note: parsed.data.note || undefined };
}
