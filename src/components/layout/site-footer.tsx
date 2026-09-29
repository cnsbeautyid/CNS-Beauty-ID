import Link from "next/link";

import { BRAND, FOOTER_NAV, SOCIAL_LINKS } from "@/config/site";

import { Container } from "./container";
import { Logo } from "./logo";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-brand-ivory">
      <Container className="grid gap-10 py-section tablet:grid-cols-2 desktop:grid-cols-4">
        <div className="flex flex-col items-start gap-4">
          <Logo showFounder align="start" />
          <p className="max-w-xs font-display text-body-l text-text-secondary italic">{BRAND.tagline}</p>
        </div>

        {FOOTER_NAV.map((group, index) => (
          <nav key={group.title} aria-labelledby={`footer-nav-${index}`}>
            <h2 id={`footer-nav-${index}`} className="font-body text-caption font-medium tracking-eyebrow text-text-primary uppercase">
              {group.title}
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-9 items-center text-body-s text-text-secondary transition-colors duration-(--duration-base) hover:text-text-primary"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      <div className="border-t border-border">
        <Container className="flex flex-col gap-3 py-6 text-caption text-text-secondary tablet:flex-row tablet:items-center tablet:justify-between">
          <p>
            © {year} {BRAND.legalName} {BRAND.founderLine}
          </p>
          {SOCIAL_LINKS.length > 0 && (
            <ul className="flex gap-4">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="hover:text-text-primary">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </div>
    </footer>
  );
}
