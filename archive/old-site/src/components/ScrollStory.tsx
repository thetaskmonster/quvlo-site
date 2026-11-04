import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { BRAND, Container, Eyebrow } from "./ui";

/**
 * Scrollytelling, a pinned browser preview that assembles as you scroll:
 * wireframe, designed, live. Classic "sticky graphic + scrolling steps"
 * pattern, driven by an IntersectionObserver. Under prefers-reduced-motion
 * it renders the stacked all-stages layout (no pin, no scroll reveal).
 * Non-active steps are de-emphasised with solid tokens (never opacity), so
 * all text stays above 4.5:1. Decorative previews are aria-hidden.
 */
const steps = [
  {
    n: "01",
    title: "We map the structure",
    body: "Before a pixel of design, we plan what your visitors need to see, and the order that turns them into calls and customers.",
  },
  {
    n: "02",
    title: "We design it around you",
    body: "A look drawn from your business, not a theme off a shelf. Colour, type, and layout that make you the obvious choice.",
  },
  {
    n: "03",
    title: "We ship it fast",
    body: "Real photography, real copy, hand-written code. Fast, accessible, and entirely yours the day it launches.",
  },
];

export function ScrollStory() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduce) return; // no scroll-driven reveal under reduced motion
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = Number((entry.target as HTMLElement).dataset.i);
            setActive(i);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    stepRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [reduce]);

  return (
    <section
      id="process"
      className="scroll-mt-24 border-t border-hairline py-24 md:py-32"
    >
      <Container>
        <Eyebrow>How we build</Eyebrow>
        <h2 className="mt-6 max-w-2xl font-display text-4xl font-semibold tracking-[-0.02em] text-ink-100 md:text-5xl">
          From blank page to a site that works.
        </h2>
        <p className="mt-5 max-w-xl font-sans text-lg leading-relaxed text-ink-300">
          Every {BRAND} build follows the same disciplined path. Scroll to watch
          it come together.
        </p>

        <div className={reduce ? "mt-14" : "mt-14 lg:grid lg:grid-cols-2 lg:gap-16"}>
          {/* Steps */}
          <div className={reduce ? "space-y-14" : ""}>
            {steps.map((step, i) => {
              const on = reduce || active === i; // emphasised?
              return (
                <div
                  key={step.n}
                  data-i={i}
                  ref={(el) => {
                    stepRefs.current[i] = el;
                  }}
                  className={
                    reduce
                      ? ""
                      : "py-8 lg:flex lg:min-h-[68vh] lg:flex-col lg:justify-center"
                  }
                >
                  {/* De-emphasise with solid tokens (all clear 4.5:1), not opacity */}
                  <div className="transition-colors duration-500">
                    <span
                      className={`font-mono text-xs tracking-[0.22em] ${
                        on ? "text-amber" : "text-ink-500"
                      }`}
                    >
                      {step.n}
                    </span>
                    <h3
                      className={`mt-3 font-display text-2xl font-semibold tracking-[-0.01em] md:text-3xl ${
                        on ? "text-ink-100" : "text-ink-500"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`mt-3 max-w-md font-sans leading-relaxed ${
                        on ? "text-ink-300" : "text-ink-500"
                      }`}
                    >
                      {step.body}
                    </p>
                  </div>

                  {/* Mobile, and reduced-motion on all sizes: stage inline */}
                  <div className={reduce ? "mt-6" : "mt-6 lg:hidden"}>
                    <Frame>
                      <Stage i={i} />
                    </Frame>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop pinned preview, only when motion is allowed */}
          {!reduce && (
            <div className="hidden lg:block">
              <div className="sticky top-0 flex h-screen items-center">
                <div className="w-full">
                  <Frame>
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 transition-opacity duration-500"
                        style={{ opacity: active === i ? 1 : 0 }}
                      >
                        <Stage i={i} />
                      </div>
                    ))}
                  </Frame>
                  <div className="mt-4 flex items-center gap-1.5">
                    {steps.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 rounded-full transition-all duration-500 ${
                          active === i ? "w-8 bg-amber" : "w-4 bg-hairline"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}

/* Browser frame (decorative preview). */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-hairline bg-console shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]"
    >
      <div className="flex items-center gap-2 border-b border-hairline bg-panel px-3 py-2">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-white/15" />
          <span className="h-2 w-2 rounded-full bg-white/15" />
          <span className="h-2 w-2 rounded-full bg-white/15" />
        </div>
        <div className="mx-auto rounded bg-obsidian/60 px-6 py-0.5 font-mono text-[9px] tracking-wide text-ink-500">
          northside.dental
        </div>
      </div>
      <div className="relative aspect-[16/10]">{children}</div>
    </div>
  );
}

function Stage({ i }: { i: number }) {
  if (i === 0) return <StageWire />;
  if (i === 1) return <StageDesign />;
  return <StageLive />;
}

/* 01, Structure (wireframe) */
function StageWire() {
  return (
    <div className="absolute inset-0 bg-[#12141a] p-[5%]">
      <div className="flex items-center justify-between">
        <div className="h-2 w-14 rounded bg-white/15" />
        <div className="flex gap-2">
          <div className="h-2 w-6 rounded bg-white/10" />
          <div className="h-2 w-6 rounded bg-white/10" />
          <div className="h-2 w-6 rounded bg-white/10" />
        </div>
      </div>
      <div className="mt-[9%] space-y-2">
        <div className="h-3.5 w-[70%] rounded bg-white/15" />
        <div className="h-3.5 w-[45%] rounded bg-white/15" />
      </div>
      <div className="mt-3 h-5 w-20 rounded border border-dashed border-white/20" />
      <div className="absolute inset-x-[5%] bottom-[6%] grid grid-cols-3 gap-2">
        <div className="h-12 rounded-md border border-dashed border-white/15" />
        <div className="h-12 rounded-md border border-dashed border-white/15" />
        <div className="h-12 rounded-md border border-dashed border-white/15" />
      </div>
    </div>
  );
}

/* 02, Designed */
function StageDesign() {
  return (
    <div className="absolute inset-0 bg-white p-[5%] text-[#0f2f3a]">
      <div className="flex items-center justify-between">
        <span className="font-display text-[11px] font-semibold">Northside</span>
        <nav className="flex items-center gap-2.5 font-sans text-[7px] text-[#0f2f3a]/70">
          <span>Services</span>
          <span>Team</span>
          <span className="rounded-full bg-[#14b8a6] px-2 py-0.5 text-white">
            Book
          </span>
        </nav>
      </div>
      <div className="mt-[8%]">
        <div className="font-display text-[18px] font-semibold leading-tight">
          A brighter dental visit.
        </div>
        <p className="mt-1.5 font-sans text-[7px] text-[#0f2f3a]/60">
          Gentle, modern care for the whole family.
        </p>
        <span className="mt-2.5 inline-flex rounded-full bg-[#14b8a6] px-3 py-1 font-sans text-[7px] font-semibold text-white">
          Book an appointment
        </span>
      </div>
      <div className="absolute inset-x-[5%] bottom-[6%] grid grid-cols-3 gap-2 font-sans text-[6.5px]">
        {["Cleanings", "Whitening", "Implants"].map((c) => (
          <div key={c} className="rounded-md bg-[#f0faf9] px-2 py-1.5 text-[#0f2f3a]/70">
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 03, Live */
function StageLive() {
  return (
    <div className="absolute inset-0 bg-white text-[#0f2f3a]">
      <div className="relative h-[62%]">
        <img
          src="/images/dental.jpg"
          alt=""
          width={1200}
          height={750}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/25" />
        <div className="relative flex h-full flex-col justify-between p-[5%] text-white">
          <div className="flex items-center justify-between">
            <span className="font-display text-[11px] font-semibold">Northside</span>
            <nav className="flex items-center gap-2.5 font-sans text-[7px] text-white/85">
              <span>Services</span>
              <span>Team</span>
              <span className="rounded-full bg-[#14b8a6] px-2 py-0.5">Book</span>
            </nav>
          </div>
          <div>
            <div className="font-display text-[16px] font-semibold leading-tight">
              A brighter dental visit.
            </div>
            <span className="mt-2 inline-flex rounded-full bg-[#14b8a6] px-3 py-1 font-sans text-[7px] font-semibold">
              Book an appointment
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 p-[5%] pt-[3.5%] font-sans text-[6.5px]">
        {["★ 4.9 · 600+ reviews", "Most insurance", "Open Saturdays"].map((c) => (
          <div
            key={c}
            className="rounded-md bg-[#f0faf9] px-2 py-1.5 text-center text-[#0f2f3a]/70"
          >
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}
