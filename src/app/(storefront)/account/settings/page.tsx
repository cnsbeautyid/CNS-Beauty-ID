import { ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { AddressBook } from "@/features/account/address-book";
import { ProfileForm } from "@/features/account/profile-form";
import { AccountStrip } from "@/features/auth/sign-out-button";
import { requireUser } from "@/lib/auth/session";
import { getOwnProfile } from "@/services/account/account";
import { getCheckoutPrefill } from "@/services/checkout/addresses";

export const metadata = { title: "Pengaturan" };

export default async function AccountSettingsPage() {
  const user = await requireUser(ROUTES.account.settings);
  const [profile, prefill] = await Promise.all([getOwnProfile(), getCheckoutPrefill()]);

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-h1 text-brand-cocoa-dark">Pengaturan</h1>

      <section aria-labelledby="profile-title" className="flex flex-col gap-5">
        <h2 id="profile-title" className="text-h3">
          Profil
        </h2>
        {profile ? (
          <ProfileForm
            email={profile.email ?? user.email}
            defaults={{
              fullName: profile.fullName ?? "",
              phone: profile.phone ?? "",
              whatsapp: profile.whatsapp ?? "",
              birthDate: profile.birthDate ?? "",
              marketingOptIn: profile.marketingOptIn,
              whatsappOptIn: profile.whatsappOptIn,
            }}
          />
        ) : (
          <ErrorState
            className="py-6"
            description="Profil belum dapat dimuat. Silakan coba lagi."
            action={
              <ButtonLink href={ROUTES.account.settings} variant="secondary">
                Coba lagi
              </ButtonLink>
            }
          />
        )}
      </section>

      <section aria-labelledby="addresses-title" className="flex flex-col gap-5">
        <h2 id="addresses-title" className="text-h3">
          Alamat
        </h2>
        <AddressBook addresses={prefill.addresses} />
      </section>

      <section aria-labelledby="session-title" className="flex flex-col gap-3 desktop:hidden">
        <h2 id="session-title" className="text-h3">
          Sesi
        </h2>
        <AccountStrip email={user.email} />
      </section>
    </div>
  );
}
