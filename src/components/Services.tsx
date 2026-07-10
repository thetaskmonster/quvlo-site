import { BRAND, Container, Eyebrow, FadeUp } from "./ui";
import type { ReactNode } from "react";

const services: {
  title: string;
  tag: string;
  body: string;
  icon: ReactNode;
  primary: boolean;
}[] = [
  {
    title: "Websites",
    tag: "Our core craft",
    body: "Custom, hand-coded marketing sites that make small businesses look established, designed to turn visitors into customers.",
    icon: <IconWindow />,
    primary: true,
  },
  {
    title: "Automation",
    tag: "As you grow",
    body: "Wire your site to the tools you already use, like bookings, follow-ups, and lead routing, so the busywork runs itself.",
    icon: <IconFlow />,
    primary: false,
  },
  {
    title: "AI",
    tag: "On request",
    body: "Practical AI where it earns its keep: smart intake, instant answers, and drafting that saves you hours each week.",
    icon: <IconSpark />,
    primary: false,
  },
];

export function Services() {
  return (
    <section id="services" className="scroll-mt-24 py-28 md:py-40">
      <Container>
        <FadeUp>
          <Eyebrow>The bigger picture</Eyebrow>
        </FadeUp>
        <FadeUp delay={0.06}>
          <h2 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-[-0.02em] text-ink-100 md:text-5xl">
            More than websites.
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="mt-5 max-w-xl font-sans text-lg leading-relaxed text-ink-300">
            Websites are where we start, and where most clients stay. But
            {" "}{BRAND} also builds the systems behind them, when you&rsquo;re
            ready.
          </p>
        </FadeUp>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {services.map((service, i) => (
            <FadeUp key={service.title} delay={0.08 * i} className="h-full">
              <article
                className={`group relative flex h-full flex-col rounded-xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                  service.primary
                    ? "border-amber/40 bg-console shadow-[0_0_0_1px_rgba(240,165,56,0.12),0_30px_60px_-30px_rgba(0,0,0,0.9)]"
                    : "border-hairline bg-panel hover:border-ink-500"
                }`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-lg ${
                    service.primary
                      ? "bg-amber/15 text-amber"
                      : "bg-white/[0.04] text-ink-300"
                  }`}
                >
                  {service.icon}
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <h3 className="font-display text-xl font-semibold text-ink-100">
                    {service.title}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                      service.primary
                        ? "bg-amber/10 text-amber"
                        : "bg-white/[0.04] text-ink-500"
                    }`}
                  >
                    {service.tag}
                  </span>
                </div>
                <p className="mt-3 font-sans text-[15px] leading-relaxed text-ink-300">
                  {service.body}
                </p>
              </article>
            </FadeUp>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* Icons ------------------------------------------------------------- */
function IconWindow() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8h18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6" cy="6" r="0.6" fill="currentColor" />
    </svg>
  );
}
function IconFlow() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="15" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 7h5a4 4 0 0 1 4 4v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconSpark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l1.8 4.7L18.5 9.5 13.8 11.3 12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
