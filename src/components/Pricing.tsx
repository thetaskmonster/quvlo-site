import {
  ArrowRight,
  CARE_PLAN_URL,
  CheckTick,
  Container,
  DEPOSIT_URL,
  Eyebrow,
  FadeUp,
  PAYMENTS_LIVE,
  btnGhost,
  btnPrimary,
} from "./ui";
import { Guarantee } from "./Guarantee";

type Tier = {
  name: string;
  tagline: string;
  features: [string, string][];
  totalValue: string;
  price: string;
  cadence: string;
  popular: boolean;
};

/* Value figures reflect typical standalone market rates for each service,
   shown so the client can see exactly what's included. */
const tiers: Tier[] = [
  {
    name: "Landing",
    tagline: "One page, engineered to turn visitors into calls.",
    features: [
      ["Custom single-page design", "$1,500"],
      ["Mobile-perfect, fast build", "$500"],
      ["Lead capture or booking, wired to a trusted service", "$400"],
      ["SEO & launch setup", "$300"],
      ["Accessibility (WCAG) compliance", "$300"],
    ],
    totalValue: "$3,000",
    price: "$1,500",
    cadence: "one-time",
    popular: false,
  },
  {
    name: "Business Site",
    tagline: "A complete presence that makes you the obvious choice.",
    features: [
      ["Custom multi-page design, up to 5 pages", "$3,000"],
      ["Conversion-focused copy guidance", "$800"],
      ["SEO foundations", "$600"],
      ["Lead capture & booking setup", "$500"],
      ["Mobile & performance optimization", "$500"],
      ["Accessibility (WCAG) compliance", "$500"],
      ["Analytics-ready launch", "$300"],
    ],
    totalValue: "$6,200",
    price: "$3,000",
    cadence: "one-time",
    popular: true,
  },
  {
    name: "Care Plan",
    tagline: "Ongoing operations so your site stays sharp.",
    features: [
      ["Managed hosting & uptime monitoring", "$120/mo"],
      ["Content updates & edits", "$200/mo"],
      ["Performance & security checks", "$150/mo"],
      ["Priority support", "$100/mo"],
    ],
    totalValue: "$570/mo",
    price: "$300",
    cadence: "/mo",
    popular: false,
  },
];

const path = [
  {
    n: "01",
    title: "Free teardown",
    desc: "See exactly what's costing you customers. No cost, no pitch.",
    active: false,
  },
  {
    n: "02",
    title: "Your build",
    desc: "We design and build the site your business deserves.",
    active: true,
  },
  {
    n: "03",
    title: "Care plan",
    desc: "We keep it fast, current, and handled. Hands-off for you.",
    active: false,
  },
];

const reassurances = [
  "Fixed price, quoted upfront",
  "No surprises, ever",
  "You own everything",
  "No lock-in",
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 border-t border-hairline py-28 md:py-40"
    >
      <Container>
        <FadeUp>
          <Eyebrow>Pricing & offer</Eyebrow>
        </FadeUp>
        <FadeUp delay={0.06}>
          <h2 className="mt-6 max-w-3xl font-display text-4xl font-semibold tracking-[-0.02em] text-ink-100 md:text-5xl">
            Everything included, and what each piece is worth.
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="mt-5 max-w-xl font-sans text-lg leading-relaxed text-ink-300">
            Fixed pricing, quoted upfront. Here&rsquo;s every part of the build
            with its typical standalone value, so you can see exactly what
            you&rsquo;re getting, and why the price is what it is.
          </p>
        </FadeUp>

        {/* Funnel path */}
        <FadeUp delay={0.12}>
          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {path.map((step) => (
              <div
                key={step.n}
                className={`rounded-xl border p-5 ${
                  step.active
                    ? "border-amber/40 bg-console"
                    : "border-hairline bg-panel"
                }`}
              >
                <div
                  className={`font-mono text-[11px] tracking-[0.2em] ${
                    step.active ? "text-amber" : "text-ink-500"
                  }`}
                >
                  {step.n}
                </div>
                <div className="mt-2 font-display text-base font-semibold text-ink-100">
                  {step.title}
                </div>
                <p className="mt-1 font-sans text-sm leading-relaxed text-ink-300">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Tiers with value stack */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <FadeUp key={tier.name} delay={0.06 * i} className="h-full">
              <article
                className={`group relative flex h-full flex-col rounded-xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
                  tier.popular
                    ? "border-amber/40 bg-console shadow-[0_0_0_1px_rgba(240,165,56,0.12),0_30px_60px_-30px_rgba(0,0,0,0.9)]"
                    : "border-hairline bg-panel hover:border-ink-500"
                }`}
              >
                {tier.popular && (
                  <span className="absolute right-6 top-6 rounded-full border border-amber/40 bg-amber/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-amber">
                    Most popular
                  </span>
                )}

                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-500">
                  {tier.name}
                </h3>
                <p className="mt-3 max-w-[92%] font-sans text-[15px] leading-relaxed text-ink-300">
                  {tier.tagline}
                </p>

                <ul className="mt-7 flex flex-1 flex-col gap-2.5">
                  {tier.features.map(([label, value]) => (
                    <li
                      key={label}
                      className="flex items-start justify-between gap-3 border-b border-hairline/60 pb-2.5 last:border-0"
                    >
                      <span className="flex items-start gap-2.5 font-sans text-sm text-ink-300">
                        <CheckTick />
                        <span>{label}</span>
                      </span>
                      <span className="shrink-0 pt-0.5 font-mono text-[11px] text-ink-500">
                        {value}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Value reveal */}
                <div className="mt-6 border-t border-hairline pt-5">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-sm text-ink-500">
                      Total value
                    </span>
                    <span className="font-sans text-sm text-ink-300 line-through decoration-ink-500/60">
                      {tier.totalValue}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="font-sans text-sm font-medium text-ink-100">
                      Your price
                    </span>
                    <span className="flex items-baseline gap-1">
                      <span className="font-display text-4xl font-semibold tracking-tight text-ink-100">
                        {tier.price}
                      </span>
                      <span className="font-sans text-sm text-ink-500">
                        {tier.cadence === "/mo" ? "/mo" : "one-time"}
                      </span>
                    </span>
                  </div>
                </div>

                {(() => {
                  const isCare = tier.name === "Care Plan";
                  // Care Plan can subscribe directly via Stripe; everything
                  // else routes to contact for an individual quote/invoice.
                  const href = isCare && CARE_PLAN_URL ? CARE_PLAN_URL : "#contact";
                  const external = href.startsWith("http");
                  return (
                    <a
                      href={href}
                      {...(external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className={`mt-7 ${tier.popular ? btnPrimary : btnGhost}`}
                    >
                      {isCare ? "Start the Care Plan" : "Start your project"}
                      <ArrowRight />
                    </a>
                  );
                })()}
              </article>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={0.08}>
          <p className="mt-5 font-sans text-xs leading-relaxed text-ink-500">
            Value figures reflect typical standalone rates for each service,
            shown for transparency, not as a discount gimmick. Every project is
            quoted exactly before anything begins.
          </p>
        </FadeUp>

        {PAYMENTS_LIVE && (
          <FadeUp delay={0.09}>
            <p className="mt-4 font-sans text-sm leading-relaxed text-ink-300">
              Flexible payment: start with a deposit and settle the balance at
              launch, or finance the full build with Affirm at checkout.
              {DEPOSIT_URL && (
                <>
                  {" "}Already scoped with us?{" "}
                  <a
                    href={DEPOSIT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber underline underline-offset-2 hover:text-amber-bright"
                  >
                    Pay your deposit
                  </a>
                  .
                </>
              )}
            </p>
          </FadeUp>
        )}

        {/* Guarantee, prominent, right under the offer */}
        <FadeUp delay={0.1}>
          <div className="mt-12">
            <Guarantee />
          </div>
        </FadeUp>

        {/* Reassurance strip */}
        <FadeUp delay={0.12}>
          <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline md:grid-cols-4">
            {reassurances.map((item) => (
              <div
                key={item}
                className="flex items-center justify-center gap-2.5 bg-panel px-4 py-5 text-center"
              >
                <CheckTick />
                <span className="font-sans text-sm text-ink-300">{item}</span>
              </div>
            ))}
          </div>
        </FadeUp>

        {/* Reason-driven scarcity */}
        <FadeUp delay={0.14}>
          <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-hairline bg-panel/40 p-6 md:p-8">
            <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-amber">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              Now booking founding clients
            </div>
            <p className="mt-4 font-sans text-[15px] leading-relaxed text-ink-300">
              Every site is hand-built by a small team, with no outsourcing and no
              template farm, so we only take on a few new builds at a time.
              Founding clients lock in today&rsquo;s rates and get direct,
              priority attention while the roster is small. When the current
              slots fill, the next intake opens later, at standard pricing.
            </p>
            <p className="mt-3 font-sans text-[15px] leading-relaxed text-ink-500">
              Most clients keep the{" "}
              <span className="text-ink-100">Care Plan</span> afterward:
              the hands-off way to stay fast, secure, and current. Optional,
              month-to-month, cancel anytime.
            </p>
          </div>
        </FadeUp>
      </Container>
    </section>
  );
}
