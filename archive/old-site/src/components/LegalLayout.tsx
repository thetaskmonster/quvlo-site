import type { ReactNode } from "react";
import { Container } from "./ui";

export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="py-24 md:py-32">
      <Container className="max-w-3xl">
        <a
          href="#/"
          className="font-mono text-xs uppercase tracking-[0.18em] text-ink-500 transition-colors hover:text-amber"
        >
          ← Back to home
        </a>
        <h1 className="mt-8 font-display text-4xl font-semibold tracking-[-0.02em] text-ink-100 md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.16em] text-ink-500">
          Last updated {updated}
        </p>
        <div className="legal mt-12 space-y-8">{children}</div>
      </Container>
    </article>
  );
}

export function LegalSection({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-ink-100">
        {heading}
      </h2>
      <div className="mt-3 space-y-3 font-sans text-[15px] leading-relaxed text-ink-300">
        {children}
      </div>
    </section>
  );
}
