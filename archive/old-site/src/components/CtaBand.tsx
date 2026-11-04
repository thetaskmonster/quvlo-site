import { ArrowRight, Container, Eyebrow, FadeUp, btnPrimary } from "./ui";

/**
 * Reusable conversion band. Same goal, varied wording, used after the
 * work, after pricing, and as the low-friction teardown offer.
 */
export function CtaBand({
  eyebrow,
  heading,
  sub,
  cta,
  href = "#contact",
}: {
  eyebrow: string;
  heading: string;
  sub: string;
  cta: string;
  href?: string;
}) {
  return (
    <section className="py-8">
      <Container>
        <FadeUp>
          <div className="relative overflow-hidden rounded-2xl border border-hairline bg-panel px-6 py-12 text-center md:px-16 md:py-16">
            {/* NVIDIA-ish depth: soft amber glow seated behind the copy */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_50%_0%,rgba(240,165,56,0.10),transparent_70%)]" />
            <div className="relative">
              <Eyebrow className="justify-center">{eyebrow}</Eyebrow>
              <h2 className="mx-auto mt-5 max-w-2xl font-display text-3xl font-semibold tracking-[-0.02em] text-ink-100 md:text-4xl">
                {heading}
              </h2>
              <p className="mx-auto mt-4 max-w-xl font-sans text-base leading-relaxed text-ink-300 md:text-lg">
                {sub}
              </p>
              <a href={href} className={`${btnPrimary} mt-8`}>
                {cta}
                <ArrowRight />
              </a>
            </div>
          </div>
        </FadeUp>
      </Container>
    </section>
  );
}
