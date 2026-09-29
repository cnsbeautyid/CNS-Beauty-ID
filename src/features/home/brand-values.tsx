import { Flower2, Gem, Heart, Sparkles, type LucideIcon } from "lucide-react";

import { Container } from "@/components/layout/container";
import { SectionHeader } from "@/components/layout/section-header";
import { HOME_COPY } from "@/content/home";

const ICONS: Record<(typeof HOME_COPY.values.items)[number]["id"], LucideIcon> = {
  quality: Gem,
  care: Flower2,
  confidence: Sparkles,
  "self-love": Heart,
};

// Brand values, not product claims (see master prompt §6.4 claim rules).
export function BrandValues() {
  const copy = HOME_COPY.values;

  return (
    <section aria-labelledby="values-title" className="py-section">
      <Container className="cns-reveal">
        <SectionHeader id="values-title" eyebrow={copy.eyebrow} title={copy.title} />
        <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 desktop:grid-cols-4">
          {copy.items.map((item) => {
            const Icon = ICONS[item.id];
            return (
              <li key={item.id} className="flex flex-col items-center text-center">
                <span
                  aria-hidden
                  className="flex size-16 items-center justify-center rounded-pill border border-brand-rose-gold text-brand-rose-gold"
                >
                  <Icon className="size-6" strokeWidth={1.25} />
                </span>
                <h3 className="mt-5 text-h4">{item.title}</h3>
                <p className="mt-2 max-w-60 text-body-s text-text-secondary">{item.description}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
