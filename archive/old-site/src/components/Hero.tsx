import { motion, useReducedMotion } from "motion/react";
import { HeroShowcase } from "./HeroShowcase";
import {
  ArrowRight,
  Container,
  EASE,
  Eyebrow,
  btnGhost,
  btnPrimary,
} from "./ui";

export function Hero() {
  const reduce = useReducedMotion();

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, ease: EASE, delay },
        };

  return (
    <section id="top" className="relative isolate overflow-hidden">
      {/* soft amber depth, no telemetry */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_60%_at_78%_28%,rgba(240,165,56,0.07),transparent_66%)]" />

      <Container className="relative py-20 md:py-24">
        <div className="grid min-h-[82vh] items-center gap-y-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-x-12">
          {/* Copy */}
          <div className="order-1">
            <motion.div {...rise(0.05)}>
              <Eyebrow>Precision-built websites</Eyebrow>
            </motion.div>

            <motion.h1
              {...rise(0.12)}
              className="mt-6 max-w-3xl font-display text-[2.75rem] font-semibold leading-[1.03] tracking-[-0.03em] text-ink-100 sm:text-6xl lg:text-7xl xl:text-[5rem]"
            >
              A website that looks established, not templated.
            </motion.h1>

            {/* Benefit line, the dream outcome */}
            <motion.p
              {...rise(0.2)}
              className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-ink-300 md:text-xl"
            >
              Look like the business people already trust, so more of the
              visitors who find you turn into calls, bookings, and paying
              customers. Built with the discipline of airline operations:
              precise, reliable, unmistakably yours.
            </motion.p>

            <motion.div
              {...rise(0.28)}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <a href="#contact" className={btnPrimary}>
                Start your project
                <ArrowRight />
              </a>
              <a href="#work" className={btnGhost}>
                See our work
              </a>
            </motion.div>

            {/* Urgency + credibility */}
            <motion.div
              {...rise(0.36)}
              className="mt-9 flex flex-col gap-3 border-t border-hairline pt-6 text-sm"
            >
              <span className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-amber">
                <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                Now booking a few founding clients. Hand-built, limited capacity
              </span>
              <span className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500">
                <span className="h-1.5 w-1.5 rounded-full bg-ink-500" />
                Built by an airline operations professional
              </span>
            </motion.div>
          </div>

          {/* Visual */}
          <motion.div
            className="order-2"
            initial={reduce ? false : { opacity: 0, scale: 0.94 }}
            animate={reduce ? undefined : { opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: EASE, delay: 0.2 }}
          >
            <HeroShowcase />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
