import {
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/* Shared constants -------------------------------------------------- */
export const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ *
 * BRAND TOKENS: the locked name/domain/email. Everything in the app
 * references these constants, so this is the single source of truth
 * (mirrored only in index.html and public/og-image.svg).
 * ------------------------------------------------------------------ */
export const BRAND = "Quvlo";
export const DOMAIN = "quvlo.co";
export const EMAIL = "hello@quvlo.co";
export const MAILTO = `mailto:${EMAIL}`;

/* ------------------------------------------------------------------ *
 * LEGAL IDENTITY: single source of truth for every name/place string
 * that changes when the business entity changes. Today the studio
 * trades as a sole proprietorship (Kyle Chalk, doing business as
 * Quvlo). When "Quvlo LLC" is formed, edit the four constants below,
 * once, and the footer, Privacy, Terms, and founder credit all update.
 * Nothing else in the app hardcodes these strings.
 * ------------------------------------------------------------------ */
export const FOUNDER = "Kyle Chalk";
export const LEGAL_ENTITY = "Kyle Chalk"; // sole proprietor, doing business as Quvlo
export const LEGAL_LOCATION = "Dallas, Texas";
export const GOVERNING_LAW = "the State of Texas";

/* Social profiles. Add a real profile URL to show its icon in the
 * footer; only add a platform once its page actually exists (a dead link
 * is worse than no link). One edit, one live icon. */
export const SOCIALS: {
  platform: "instagram" | "tiktok" | "linkedin" | "x";
  href: string;
}[] = [
  { platform: "instagram", href: "https://instagram.com/quvlo.co" },
  // { platform: "tiktok", href: "https://www.tiktok.com/@quvlo.co" },
  // { platform: "linkedin", href: "https://www.linkedin.com/company/quvlo" },
];

/* ------------------------------------------------------------------ *
 * PAYMENT LINKS (Stripe hosted). Paste the URLs Stripe gives you. An
 * empty string keeps that button pointing at the contact form, so the
 * site never ships a broken or premature "pay" path. These are PUBLIC
 * hosted-checkout URLs, never secret keys, so they belong here safely.
 * Affirm / Klarna / Afterpay are toggled on inside the Stripe dashboard,
 * not in this code. Any payment UI stays hidden until a link is set.
 * ------------------------------------------------------------------ */
export const CARE_PLAN_URL: string = ""; // Stripe subscription link, $300/mo
export const DEPOSIT_URL: string = ""; // Stripe Payment Link for the start deposit
export const PAYMENTS_LIVE = Boolean(CARE_PLAN_URL || DEPOSIT_URL);

/* Buttons: amber only fills the primary. Micro-interaction: subtle
   lift + amber glow on hover, crisp settle on press. */
export const btnPrimary =
  "group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md bg-amber px-5 py-3 " +
  "font-sans text-sm font-medium text-obsidian transition-[transform,box-shadow,background-color] " +
  "duration-200 ease-out hover:-translate-y-0.5 hover:bg-amber-bright " +
  "hover:shadow-[0_12px_30px_-10px_rgba(240,165,56,0.6)] active:translate-y-0";

export const btnGhost =
  "group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-hairline " +
  "bg-white/[0.02] px-5 py-3 font-sans text-sm font-medium text-ink-100 transition-[transform,border-color,background-color] " +
  "duration-200 ease-out hover:-translate-y-0.5 hover:border-ink-500 hover:bg-white/[0.05] active:translate-y-0";

/* Form field base: comfortable tap target, amber focus glow. */
export const fieldBase =
  "w-full min-h-[44px] rounded-md border border-hairline bg-panel/60 px-4 py-3 font-sans text-[15px] " +
  "text-ink-100 placeholder:text-ink-500 transition-[border-color,box-shadow] duration-200 " +
  "focus:border-amber/60 focus:outline-none focus:ring-2 focus:ring-amber/25 focus:ring-offset-0 " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:border-danger aria-[invalid=true]:focus:ring-danger/25";

/* Layout primitive: one shared measure, capped for ultrawide. */
export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10 ${className}`}>
      {children}
    </div>
  );
}

/* Mono eyebrow with an amber indicator tick. */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.22em] text-ink-500 ${className}`}
    >
      <span className="h-1 w-1 rounded-full bg-amber" />
      {children}
    </span>
  );
}

/* Quiet, engineered reveal: fade + short rise, honoring reduced motion. */
export function FadeUp({
  children,
  delay = 0,
  y = 18,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* Telemetry-style count-up. Resolves instantly under reduced motion. */
export function CountUp({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setVal(to);
      return;
    }
    const controls = animate(0, to, {
      duration: 1.2,
      ease: EASE,
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, to, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {val}
      {suffix}
    </span>
  );
}

/* Icons ------------------------------------------------------------- */
export function ArrowRight() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="transition-transform duration-200 group-hover:translate-x-0.5"
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckTick() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="mt-0.5 shrink-0 text-amber"
    >
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
