import type { ReactNode } from "react";
import { BRAND, Container, Eyebrow, FadeUp } from "./ui";

/**
 * Concept builds, not client work. {BRAND} is new, so rather than borrow
 * logos we don't have, we show the caliber and range we design to. Each
 * mockup pairs a real photo (Pexels, free, commercial, no attribution)
 * with a DISTINCT layout, so the set reads like a real agency portfolio
 * rather than one template recolored six times.
 */
const projects: {
  industry: string;
  url: string;
  note: string;
  screen: ReactNode;
}[] = [
  {
    industry: "Dental Practice",
    url: "brightsmile.dental",
    note: "Calm, clean, appointment-first.",
    screen: <DentalMock />,
  },
  {
    industry: "Law Firm",
    url: "halebishop.law",
    note: "Authoritative, editorial, credible.",
    screen: <LawMock />,
  },
  {
    industry: "Home Services (HVAC)",
    url: "summithvac.com",
    note: "Bold, call-now urgency.",
    screen: <HvacMock />,
  },
  {
    industry: "Med Spa & Salon",
    url: "lumierespa.co",
    note: "Elegant, aspirational, booking-led.",
    screen: <MedSpaMock />,
  },
  {
    industry: "Fitness Studio",
    url: "ironline.fit",
    note: "Bold, energetic, high-contrast.",
    screen: <FitnessMock />,
  },
  {
    industry: "Accounting & Advisory",
    url: "meritcpa.co",
    note: "Professional, numbers-forward.",
    screen: <AccountingMock />,
  },
];

export function Work() {
  return (
    <section id="work" className="scroll-mt-24 border-t border-hairline py-28 md:py-40">
      <Container>
        <FadeUp>
          <Eyebrow>Selected concepts</Eyebrow>
        </FadeUp>
        <FadeUp delay={0.06}>
          <h2 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-[-0.02em] text-ink-100 md:text-5xl">
            The kind of sites we build.
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="mt-5 max-w-xl font-sans text-lg leading-relaxed text-ink-300">
            {BRAND} is new. So instead of borrowed logos, here&rsquo;s the
            caliber and range we design to. Original concept builds for common
            local businesses, each with its own layout and voice.
          </p>
        </FadeUp>

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {projects.map((project, i) => (
            <FadeUp key={project.industry} delay={0.06 * (i % 2)}>
              <figure className="group">
                <BrowserFrame url={project.url}>{project.screen}</BrowserFrame>
                <figcaption className="mt-5 flex items-baseline justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-ink-100">
                      {project.industry}
                    </h3>
                    <p className="mt-1 font-sans text-sm text-ink-300">
                      {project.note}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-hairline px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
                    Concept
                  </span>
                </figcaption>
              </figure>
            </FadeUp>
          ))}
        </div>
      </Container>
    </section>
  );
}

/* Browser chrome. The whole preview is decorative art (the figcaption is
   its accessible name), so the frame is aria-hidden, but every photo
   still carries descriptive alt text. */
function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-hairline bg-console shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] transition-all duration-300 group-hover:-translate-y-1 group-hover:border-amber/30 group-hover:shadow-[0_40px_80px_-32px_rgba(0,0,0,0.95)]"
    >
      <div className="flex items-center gap-3 border-b border-hairline bg-panel px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <div className="flex-1">
          <div className="mx-auto flex h-6 max-w-[60%] items-center justify-center rounded-md border border-hairline bg-obsidian/60 font-mono text-[10px] tracking-wide text-ink-500">
            {url}
          </div>
        </div>
      </div>
      <div className="aspect-[16/10] w-full overflow-hidden">{children}</div>
    </div>
  );
}

/* Photo element, Pexels License (free, commercial, no attribution). */
function Ph({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      width={1200}
      height={750}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

function Stars({ className = "" }: { className?: string }) {
  return <span className={`tracking-[1px] ${className}`}>★★★★★</span>;
}

/* ================================================================== *
 * 1 · DENTAL, announcement bar + split + booking widget.
 * ================================================================== */
function DentalMock() {
  const times = ["9:00", "10:30", "1:15", "2:45", "4:00"];
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center justify-center gap-2 bg-[#0d7d73] py-[1.4%] text-center font-sans text-[6.5px] font-medium text-white/95">
        New patients welcome · Most insurance accepted · Open Saturdays
      </div>
      <div className="flex flex-1">
        <div className="relative w-[42%]">
          <Ph
            src="/images/dental.jpg"
            alt="Modern dental office interior with a dental chair"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0d5c56]/45" />
          <div className="relative flex h-full flex-col justify-between p-[9%] text-white">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-[12px] font-semibold">
                Brightsmile
              </span>
              <span className="h-1 w-1 rounded-full bg-white/80" />
            </div>
            <div>
              <div className="font-display text-[15px] font-semibold leading-[1.08] tracking-[-0.01em] drop-shadow">
                Healthy smiles, gentle care.
              </div>
              <div className="mt-1.5 font-mono text-[6.5px] uppercase tracking-[0.14em] text-white/80">
                Emergency? Call (555) 010-2044
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-[58%] flex-col justify-center bg-[#f0faf9] px-[6%] text-[#0f2f3a]">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[7px] uppercase tracking-[0.2em] text-[#0d7d73]">
              Book in 30 seconds
            </p>
            <span className="rounded-full bg-[#e3f5f2] px-2 py-0.5 font-sans text-[6.5px] font-semibold text-[#0d7d73]">
              Next available: Today
            </span>
          </div>
          <div className="mt-1 font-display text-[14px] font-semibold">
            Reserve your visit
          </div>

          <div className="mt-2.5 flex gap-1.5">
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
              <span
                key={d}
                className={`rounded-md px-1.5 py-1 font-sans text-[7px] font-medium ${
                  i === 2 ? "bg-[#14b8a6] text-white" : "bg-white text-[#0f2f3a]/70"
                }`}
              >
                {d}
              </span>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {times.map((t, i) => (
              <span
                key={t}
                className={`rounded-md py-1 text-center font-sans text-[7px] ${
                  i === 1
                    ? "bg-[#14b8a6]/15 text-[#0d7d73] ring-1 ring-[#14b8a6]"
                    : "bg-white text-[#0f2f3a]/70"
                }`}
              >
                {t}
              </span>
            ))}
          </div>

          <span className="mt-3 rounded-md bg-[#14b8a6] py-1.5 text-center font-sans text-[8.5px] font-semibold text-white">
            Confirm appointment
          </span>
          <div className="mt-2.5 flex items-center gap-2 font-sans text-[7px] text-[#0f2f3a]/65">
            <Stars className="text-[#f5a524]" />
            <span className="font-semibold text-[#0f2f3a]">4.9</span>
            <span>· 600+ reviews</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 2 · LAW, top bar + editorial + trust + stat band.
 * ================================================================== */
function LawMock() {
  return (
    <div className="flex h-full w-full flex-col bg-[#f3efe8] text-[#14233b]">
      <div className="flex items-center justify-center bg-[#14233b] py-[1.2%] font-mono text-[6px] uppercase tracking-[0.22em] text-[#e6cf9b]">
        Free case review · No fee unless we win
      </div>
      <div className="h-[2px] w-full bg-[#a8823f]" />
      <div className="flex flex-1 flex-col px-[5.5%] py-[3%]">
        <header className="flex items-center justify-between">
          <span className="font-display text-[12px] font-semibold tracking-[0.03em]">
            HALE &amp; BISHOP
          </span>
          <nav className="flex items-center gap-3 font-sans text-[8px] text-[#14233b]/70">
            <span>Practice</span>
            <span>Attorneys</span>
            <span>Results</span>
            <span className="border border-[#a8823f] px-2.5 py-1 text-[#8a6a2f]">
              Free consultation
            </span>
          </nav>
        </header>

        <div className="mt-[3%] grid flex-1 grid-cols-[1.5fr_1fr] items-center gap-5">
          <div>
            <span className="font-mono text-[7px] uppercase tracking-[0.24em] text-[#a8823f]">
              Trial Attorneys · Est. 1994
            </span>
            <div className="mt-1.5 font-display text-[23px] font-semibold leading-[0.98] tracking-[-0.02em]">
              Trusted counsel when it matters most.
            </div>
            <p className="mt-2 max-w-[92%] font-sans text-[8px] leading-relaxed text-[#14233b]/65">
              Personal injury and family law, handled with discretion and
              a record of results.
            </p>
            <div className="mt-2 flex items-center gap-2 font-sans text-[7px] text-[#14233b]/70">
              <Stars className="text-[#a8823f]" />
              <span className="font-semibold">5.0</span>
              <span>· 300+ client reviews</span>
            </div>
            <span className="mt-3 inline-flex items-center bg-[#a8823f] px-3 py-1.5 font-sans text-[8px] font-semibold text-[#f3efe8]">
              Request a free consultation
            </span>
          </div>
          <div className="relative h-full min-h-[100px]">
            <Ph
              src="/images/law.jpg"
              alt="Scales of justice and law books on a desk"
              className="absolute inset-0 h-full w-full rounded-lg object-cover"
            />
          </div>
        </div>

        <div className="mt-[2.5%] grid grid-cols-3 gap-3 border-t border-[#14233b]/15 pt-2.5">
          {[
            ["$500M+", "Recovered for clients"],
            ["40+ yrs", "Combined experience"],
            ["5,000+", "Cases resolved"],
          ].map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-[13px] font-semibold text-[#14233b]">
                {n}
              </div>
              <div className="font-sans text-[6px] uppercase tracking-wide text-[#a8823f]">
                {l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 3 · HVAC, full-bleed, centered, urgency + trust strip.
 * ================================================================== */
function HvacMock() {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Ph
        src="/images/hvac.jpg"
        alt="HVAC technician servicing an outdoor air-conditioning unit with gauges"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[5%] py-[3.5%] text-white">
        <span className="font-display text-[12px] font-semibold">
          Summit<span className="text-[#fb923c]"> HVAC</span>
        </span>
        <nav className="flex items-center gap-3 font-sans text-[8px] text-white/85">
          <span>Services</span>
          <span>Reviews</span>
          <span className="font-semibold text-[#fb923c]">(555) 010-2033</span>
        </nav>
      </div>

      <div className="relative flex h-full flex-col items-center justify-center px-[8%] text-center text-white">
        <span className="mb-2 rounded-full bg-[#f97316] px-3 py-1 font-mono text-[7px] font-bold uppercase tracking-[0.2em]">
          24/7 emergency service
        </span>
        <div className="font-display text-[24px] font-bold leading-[1.0] tracking-[-0.02em] drop-shadow-md">
          Heating &amp; cooling, done right.
        </div>
        <p className="mt-2 max-w-[72%] font-sans text-[8.5px] text-white/85">
          Fast, honest service across the metro, same-day in most areas.
        </p>
        <div className="mt-3.5 flex items-center gap-2">
          <span className="rounded bg-[#f97316] px-4 py-1.5 font-sans text-[9px] font-bold text-white shadow-lg">
            Call (555) 010-2033
          </span>
          <span className="rounded border border-white/60 px-3 py-1.5 font-sans text-[8px] font-medium">
            Schedule online
          </span>
        </div>
      </div>

      {/* trust strip */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 border-t border-white/15 bg-black/45 py-[1.6%] font-sans text-[6.5px] text-white/85 backdrop-blur-sm">
        <span className="flex items-center gap-1">
          <span className="text-[#f5a524]">★</span> 4.9 · 1,200 reviews
        </span>
        <span className="text-white/25">|</span>
        <span>Licensed &amp; insured</span>
        <span className="text-white/25">|</span>
        <span>Financing available</span>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 4 · MED SPA, split-screen + nav + rating + offer + membership.
 * ================================================================== */
function MedSpaMock() {
  return (
    <div className="flex h-full w-full">
      <div className="flex w-[47%] flex-col bg-[#f4e9e6] px-[7%] py-[5%] text-[#2c2224]">
        <header className="flex items-center justify-between">
          <span className="font-display text-[12px] font-semibold tracking-[0.14em]">
            LUMI&Egrave;RE
          </span>
          <span className="rounded-full bg-[#b76e79] px-2.5 py-1 font-sans text-[7px] text-white">
            Book
          </span>
        </header>

        <div className="flex flex-1 flex-col justify-center">
          <p className="font-mono text-[7px] uppercase tracking-[0.25em] text-[#b76e79]">
            Med Spa &amp; Skincare
          </p>
          <div className="mt-1 font-display text-[23px] font-semibold leading-[0.96] tracking-[-0.02em]">
            Glow, restored.
          </div>
          <p className="mt-2 font-sans text-[8px] leading-relaxed text-[#2c2224]/65">
            Advanced facials, injectables &amp; laser, in a calm, private
            studio.
          </p>
          <div className="mt-2 flex items-center gap-2 font-sans text-[7px] text-[#2c2224]/70">
            <Stars className="text-[#b76e79]" />
            <span className="font-semibold">4.9</span>
            <span>· 800+ reviews</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-[#2c2224] px-4 py-1.5 font-sans text-[8px] font-medium text-[#f4e9e6]">
              Book a consult
            </span>
            <span className="font-sans text-[7px] text-[#2c2224]/60">
              Memberships from <b className="text-[#2c2224]">$99/mo</b>
            </span>
          </div>
        </div>

        <div className="flex gap-3 font-mono text-[6.5px] uppercase tracking-[0.14em] text-[#2c2224]/50">
          <span>Facials</span>
          <span>Injectables</span>
          <span>Laser</span>
        </div>
      </div>

      <div className="relative w-[53%]">
        <Ph
          src="/images/medspa.jpg"
          alt="Calm, luxurious med-spa interior"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute left-3 top-3 rounded-md bg-white/95 px-2.5 py-1.5 shadow-lg">
          <div className="font-sans text-[7.5px] font-semibold text-[#b76e79]">
            New guest offer
          </div>
          <div className="font-sans text-[6.5px] text-[#2c2224]/70">
            20% off your first facial
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 5 · FITNESS, card grid, multiple sections, urgency + social proof.
 * ================================================================== */
function FitnessMock() {
  const RED = "#ff3b46";
  const coaches = [
    "from-[#ff5a63] to-[#7a1620]",
    "from-[#5b9bf6] to-[#1e3a8a]",
    "from-[#f7b955] to-[#7c4a02]",
    "from-[#4ade80] to-[#14532d]",
  ];
  const classes: [string, string, string, boolean][] = [
    ["06:00", "Strength", "Coach Mia", false],
    ["12:15", "HIIT", "3 spots left", true],
    ["18:30", "Conditioning", "Coach Rey", false],
  ];
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-2 gap-1.5 bg-black p-[3.5%] text-white">
      {/* hero image */}
      <div className="relative col-span-2 overflow-hidden rounded-md">
        <Ph
          src="/images/fitness.jpg"
          alt="Dumbbells and weights in a modern gym"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/45" />
        <div className="relative flex h-full flex-col justify-between p-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-[12px] font-bold tracking-tight">
              IRONLINE
            </span>
            <span className="flex items-center gap-1 rounded-sm bg-white/10 px-1.5 py-0.5 font-mono text-[6px] uppercase backdrop-blur-sm">
              <span className="text-[#f5a524]">★</span> 4.9
            </span>
          </div>
          <div>
            <span
              className="mb-1 inline-block rounded-sm px-1.5 py-0.5 font-mono text-[6px] font-bold uppercase text-black"
              style={{ backgroundColor: RED }}
            >
              First class free
            </span>
            <div className="font-display text-[20px] font-bold uppercase leading-[0.88] tracking-[-0.02em]">
              Train with <span style={{ color: RED }}>intent.</span>
            </div>
          </div>
        </div>
      </div>

      {/* membership CTA */}
      <div
        className="flex flex-col justify-between rounded-md p-3 text-black"
        style={{ backgroundColor: RED }}
      >
        <div>
          <div className="font-mono text-[6px] font-bold uppercase tracking-wide">
            Membership
          </div>
          <div className="mt-1 font-display text-[17px] font-bold leading-none">
            $89<span className="text-[9px] font-semibold">/mo</span>
          </div>
          <div className="mt-1 font-sans text-[6px] font-medium leading-tight">
            Unlimited classes · No contract
          </div>
        </div>
        <span className="inline-flex items-center justify-center rounded-sm bg-black py-1 font-sans text-[7.5px] font-bold uppercase text-white">
          Start free week
        </span>
      </div>

      {/* members + coaches */}
      <div className="flex flex-col justify-center gap-2 rounded-md border border-white/15 p-3">
        <div>
          <div
            className="font-display text-[17px] font-bold leading-none"
            style={{ color: RED }}
          >
            1,200+
          </div>
          <div className="mt-0.5 font-mono text-[5.5px] uppercase tracking-wide text-white/60">
            members strong
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex -space-x-1.5">
            {coaches.map((g, i) => (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-full border border-black bg-gradient-to-br ${g}`}
              />
            ))}
          </div>
          <span className="font-mono text-[5.5px] uppercase tracking-wide text-white/60">
            12 coaches
          </span>
        </div>
      </div>

      {/* schedule */}
      <div className="col-span-2 flex flex-col justify-center rounded-md border border-white/15 px-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-mono text-[6px] uppercase tracking-[0.2em] text-white/50">
            Today&rsquo;s classes
          </span>
          <span className="font-mono text-[6px] uppercase" style={{ color: RED }}>
            View schedule →
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {classes.map(([t, c, meta, urgent]) => (
            <div key={c} className="flex items-center gap-2 font-sans text-[7.5px]">
              <span className="w-8 shrink-0 font-mono text-white/55">{t}</span>
              <span className="flex-1 font-medium">{c}</span>
              <span
                className="font-mono text-[6px] uppercase text-white/50"
                style={urgent ? { color: RED } : undefined}
              >
                {meta}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================== *
 * 6 · ACCOUNTING, nav + hero + results card + service cards + trust.
 * ================================================================== */
function AccountingMock() {
  return (
    <div className="flex h-full flex-col bg-white px-[5%] py-[3.5%] text-[#0f1f3d]">
      <header className="flex items-center justify-between">
        <span className="font-display text-[12px] font-semibold tracking-tight">
          Merit<span className="text-[#15803d]"> CPA</span>
        </span>
        <nav className="flex items-center gap-3 font-sans text-[8px] text-[#0f1f3d]/70">
          <span>Services</span>
          <span>About</span>
          <span className="rounded bg-[#15803d] px-2.5 py-1 font-semibold text-white">
            Book a call
          </span>
        </nav>
      </header>

      <div className="mt-[2.5%] grid flex-1 grid-cols-[1.12fr_1fr] gap-4">
        <div className="flex flex-col justify-center">
          <span className="font-mono text-[6.5px] uppercase tracking-[0.2em] text-[#15803d]">
            Certified Public Accountants
          </span>
          <div className="mt-1.5 font-display text-[19px] font-semibold leading-[1.02] tracking-[-0.02em]">
            Numbers you can build on.
          </div>
          <p className="mt-2 max-w-[94%] font-sans text-[8px] leading-relaxed text-[#0f1f3d]/60">
            Tax, bookkeeping &amp; advisory for growing small businesses.
          </p>
          <div className="mt-2 flex items-center gap-2 font-sans text-[7px] text-[#0f1f3d]/70">
            <Stars className="text-[#f5a524]" />
            <span className="font-semibold">4.9</span>
            <span>· trusted by 500+ businesses</span>
          </div>
          <span className="mt-3 inline-flex w-fit items-center rounded bg-[#15803d] px-3 py-1.5 font-sans text-[8px] font-semibold text-white">
            Book a free consultation
          </span>
        </div>

        <div className="relative">
          <Ph
            src="/images/accounting.jpg"
            alt="Professionals meeting in a modern office"
            className="absolute inset-0 h-full w-full rounded-lg object-cover"
          />
          <div className="absolute bottom-2 left-2 right-8 rounded-md bg-white/95 p-2 shadow-lg ring-1 ring-black/5">
            <div className="flex items-center gap-1.5">
              <span className="flex h-3 w-3 items-center justify-center rounded-full bg-[#15803d] text-[6px] text-white">
                ✓
              </span>
              <span className="font-sans text-[7.5px] font-semibold">
                $12,400 avg. tax saved
              </span>
            </div>
            <div className="mt-0.5 pl-[18px] font-sans text-[6px] text-[#0f1f3d]/55">
              per client, last filing season
            </div>
          </div>
        </div>
      </div>

      <div className="mt-[2.5%] grid grid-cols-3 gap-2">
        {[
          ["Tax prep", "Filing & planning"],
          ["Bookkeeping", "Monthly & clean"],
          ["Advisory", "Grow with clarity"],
        ].map(([t, d]) => (
          <div
            key={t}
            className="rounded-lg border border-[#0f1f3d]/10 bg-[#f7faf8] p-2.5"
          >
            <div className="mb-1.5 flex h-4 w-4 items-center justify-center rounded bg-[#15803d]/12 text-[8px] text-[#15803d]">
              ✓
            </div>
            <div className="font-sans text-[8px] font-semibold">{t}</div>
            <div className="mt-0.5 font-sans text-[6.5px] text-[#0f1f3d]/55">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
