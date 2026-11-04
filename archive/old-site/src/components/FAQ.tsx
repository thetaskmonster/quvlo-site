import { Container, Eyebrow, FadeUp } from "./ui";

const faqs = [
  {
    q: "How much does a website cost?",
    a: "Pricing is fixed and shared upfront: a Landing page starts at $1,500 and a full Business Site at $3,000. You get an exact quote before any work begins. No hourly surprises, no scope creep.",
  },
  {
    q: "How long does it take?",
    a: "A Landing page is typically live in about a week. A multi-page Business Site takes two to three weeks, depending on how quickly we get your content and feedback.",
  },
  {
    q: "What if I need changes?",
    a: "Revisions are built into every project while we're designing and building. After launch, a Care Plan covers ongoing updates, or we can handle changes as one-off requests, whichever suits you.",
  },
  {
    q: "Do I own the website?",
    a: "Completely. The design, the code, and the content are yours to keep. There's no proprietary builder to stay locked into and no license to renew. If we ever part ways, everything goes with you.",
  },
  {
    q: "What about hosting and maintenance?",
    a: "Optional, and recommended. The $300/mo Care Plan covers hosting, uptime monitoring, content updates, and security checks, so your site stays fast and current without you thinking about it. Prefer to host it yourself? That's fine too.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-24 border-t border-hairline py-28 md:py-40">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <FadeUp>
              <Eyebrow>Questions</Eyebrow>
            </FadeUp>
            <FadeUp delay={0.06}>
              <h2 className="mt-6 font-display text-4xl font-semibold tracking-[-0.02em] text-ink-100 md:text-5xl">
                No jargon. No surprises.
              </h2>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="mt-5 max-w-md font-sans text-lg leading-relaxed text-ink-300">
                The honest answers to what most people ask before starting.
              </p>
            </FadeUp>
          </div>

          <FadeUp delay={0.12} className="divide-y divide-hairline border-y border-hairline">
            {faqs.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-medium text-ink-100 transition-colors hover:text-amber [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span className="shrink-0 text-ink-500 transition-transform duration-300 group-open:rotate-45">
                    <PlusIcon />
                  </span>
                </summary>
                <p className="mt-3 max-w-2xl font-sans text-[15px] leading-relaxed text-ink-300">
                  {item.a}
                </p>
              </details>
            ))}
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
