import { Sparkles } from "lucide-react";

import { AskAIButton } from "@/components/ai/ask-ai-button";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { requireUser } from "@/lib/auth/session";
import { formatDate, formatIDR } from "@/lib/utils/format";
import { getOwnBeautyProfile, getQuizOptions } from "@/services/quiz/quiz";

export const metadata = { title: "Profil Kulit" };

export default async function AccountSkinProfilePage() {
  await requireUser(ROUTES.account.skinProfile);
  const options = await getQuizOptions();
  const profile = await getOwnBeautyProfile(options);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 text-brand-cocoa-dark">Profil Kulit</h1>
      {profile === undefined ? (
        <ErrorState
          description="Profil kulit belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
          action={
            <ButtonLink href={ROUTES.account.skinProfile} variant="secondary">
              Coba lagi
            </ButtonLink>
          }
        />
      ) : profile === null ? (
        <EmptyState
          icon={<Sparkles className="size-8" strokeWidth={1.25} />}
          title="Belum ada profil kulit"
          description="Ikuti Skin Quiz untuk menyimpan profil kulit dan mendapatkan rekomendasi rutinitas."
          action={<ButtonLink href={ROUTES.skinQuiz}>Mulai Skin Quiz</ButtonLink>}
        />
      ) : (
        <>
          <dl className="grid gap-5 rounded-lg border border-border p-6 tablet:grid-cols-2">
            {[
              ["Jenis kulit", profile.skinType ?? "Belum yakin"],
              ["Kebutuhan utama", profile.concerns.join(", ") || "-"],
              ["Sensitivitas", profile.sensitivity ?? "-"],
              ["Rutinitas saat ini", profile.routine.join(", ") || "Belum ada"],
              ["Budget per produk", profile.budget ? `Hingga ${formatIDR(profile.budget)}` : "Fleksibel"],
              ["Terakhir diperbarui", formatDate(profile.updatedAt)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-caption text-text-secondary">{label}</dt>
                <dd className="mt-1 text-body-s font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={ROUTES.skinQuiz}>Ulangi Skin Quiz</ButtonLink>
            <AskAIButton
              variant="secondary"
              prefill={`Kulit saya ${profile.skinType ?? "belum pasti jenisnya"} dengan kebutuhan ${profile.concerns.join(", ")}. Apa rekomendasimu?`}
            >
              Tanya Beauty AI
            </AskAIButton>
          </div>
          <p className="text-caption text-text-secondary">Profil ini membantu rekomendasi perawatan dan bukan diagnosis medis.</p>
        </>
      )}
    </div>
  );
}
