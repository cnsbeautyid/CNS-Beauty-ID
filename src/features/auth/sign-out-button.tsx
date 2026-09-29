import { signOutAction } from "./actions";

/** Works without JavaScript: a plain form POST to the Server Action. */
export function AccountStrip({ email }: { email: string | null }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-s text-text-secondary">
      {email && (
        <span>
          Masuk sebagai <span className="font-medium text-text-primary">{email}</span>
        </span>
      )}
      <form action={signOutAction}>
        <button type="submit" className="min-h-9 font-medium text-text-primary underline underline-offset-4">
          Keluar
        </button>
      </form>
    </div>
  );
}
