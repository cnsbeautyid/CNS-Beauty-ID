import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { ButtonLink } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { ROUTES } from "@/constants/routes";
import { QuizFlow } from "@/features/skin-quiz/quiz-flow";
import { getQuizOptions } from "@/services/quiz/quiz";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Skin Quiz",
  description: "Jawab 6 pertanyaan singkat tentang kulitmu untuk mendapatkan rekomendasi produk dan rutinitas CNS Beauty.",
  alternates: { canonical: ROUTES.skinQuiz },
  openGraph: { title: "Skin Quiz CNS Beauty", description: "Kenali kulitmu dan temukan rutinitas perawatan yang tepat." },
};

export default async function SkinQuizPage() {
  const options = await getQuizOptions();

  return (
    <main id="main-content">
      <Container className="py-10 desktop:py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-caption tracking-eyebrow text-brand-cocoa uppercase">Skin Quiz</p>
          <h1 className="mt-3 text-h1 text-brand-cocoa-dark">Kenali Kulitmu</h1>
          <p className="mt-3 text-body text-text-secondary">
            Enam pertanyaan singkat untuk menemukan produk dan rutinitas CNS Beauty yang sesuai dengan kebutuhan kulitmu.
          </p>
        </div>
        {options && options.skinTypes.length > 0 && options.concerns.length > 0 ? (
          <QuizFlow
            options={{
              skinTypes: options.skinTypes.map(({ slug, name }) => ({ slug, name })),
              concerns: options.concerns.map(({ slug, name }) => ({ slug, name })),
              steps: options.steps.map(({ slug, name }) => ({ slug, name })),
            }}
          />
        ) : (
          <ErrorState
            description="Skin Quiz belum dapat dimuat. Silakan coba lagi dalam beberapa saat."
            action={
              <ButtonLink href={ROUTES.products} variant="secondary">
                Jelajahi Produk
              </ButtonLink>
            }
          />
        )}
      </Container>
    </main>
  );
}
