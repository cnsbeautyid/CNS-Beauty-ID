import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";

export function AuthShell({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return (
    <main id="main-content">
      <Container className="flex justify-center py-12 desktop:py-20">
        <div className="w-full max-w-md">
          <h1 className="text-h1 text-brand-cocoa-dark">{title}</h1>
          <p className="mt-2 text-body text-text-secondary">{description}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 border-t border-border pt-6 text-body-s text-text-secondary">{footer}</div>
        </div>
      </Container>
    </main>
  );
}
