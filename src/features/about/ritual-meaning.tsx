import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { ABOUT_COPY } from "@/content/about";

export function RitualMeaning() {
  const copy = ABOUT_COPY.meaning;

  return (
    <section aria-labelledby="meaning-title" className="py-section">
      <Container className="cns-reveal">
        <SectionHeader id="meaning-title" eyebrow={copy.eyebrow} title={copy.title} />
        <ol className="mt-12 grid gap-x-8 gap-y-10 tablet:grid-cols-2 desktop:grid-cols-3">
          {copy.items.map((item, index) => (
            <li key={item.id} className="flex gap-5 border-t border-border pt-6">
              {/* Cocoa, not rose-gold: h3 is 22px on mobile, below the large-text threshold. */}
              <span aria-hidden className="font-display text-h3 text-brand-cocoa">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="text-h4">{item.title}</h3>
                <p className="mt-2 text-body-s text-text-secondary">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
