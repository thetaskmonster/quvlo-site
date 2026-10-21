import { BRAND, Container, Eyebrow, FadeUp, FOUNDER } from "./ui";

export function FounderQuote() {
  return (
    <section className="relative overflow-hidden py-28 md:py-40">
      <Container>
        <div className="grid gap-2 lg:grid-cols-[auto_1fr] lg:gap-16">
          {/* Oversized amber quote glyph, the art-directed break in rhythm. */}
          <div
            aria-hidden="true"
            className="select-none font-display text-[110px] leading-[0.55] text-amber/25 md:text-[150px]"
          >
            &ldquo;
          </div>

          <div className="max-w-3xl">
            <FadeUp>
              <Eyebrow>From the founder</Eyebrow>
            </FadeUp>
            <FadeUp delay={0.08}>
              <blockquote className="mt-6 font-display text-3xl font-medium leading-[1.2] tracking-[-0.01em] text-ink-100 md:text-4xl lg:text-[2.9rem] lg:leading-[1.14]">
                In airline operations, &lsquo;good enough&rsquo; doesn&rsquo;t
                fly. One missed detail grounds the aircraft. I build
                websites the same way: every element checked, nothing left to
                chance. Reliable the day it launches, and every day after.
              </blockquote>
            </FadeUp>
            <FadeUp delay={0.16}>
              <figcaption className="mt-10 flex items-center gap-4">
                <span className="h-px w-10 bg-amber" />
                <span className="font-sans text-sm text-ink-300">
                  <span className="font-medium text-ink-100">{FOUNDER}</span>,
                  {" "}Founder, {BRAND}
                </span>
              </figcaption>
            </FadeUp>
          </div>
        </div>
      </Container>
    </section>
  );
}
