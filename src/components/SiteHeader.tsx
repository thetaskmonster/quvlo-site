import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Container, EASE, btnPrimary } from "./ui";
import { Wordmark } from "./Wordmark";

const navLinks = [
  { href: "#work", label: "Work" },
  { href: "#approach", label: "Approach" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-obsidian/70 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between md:h-20">
        {/* Wordmark + umbrella breadcrumb */}
        <a
          href="#/"
          onClick={() => setOpen(false)}
          className="inline-flex items-center gap-2.5"
        >
          <Wordmark />
          <span className="hidden border-l border-hairline pl-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500 sm:inline">
            Web Studio
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-sans text-sm text-ink-300 transition-colors hover:text-ink-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a href="#contact" className={`${btnPrimary} hidden md:inline-flex`}>
          Start a project
        </a>

        {/* Mobile toggle, 44px tap target */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-hairline text-ink-100 transition-colors hover:bg-white/5 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <Burger open={open} />
        </button>
      </Container>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            className="md:hidden"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <div className="border-t border-hairline bg-obsidian/95 backdrop-blur-md">
              <Container className="flex flex-col gap-1 py-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-[44px] items-center rounded-md px-2 font-sans text-base text-ink-300 transition-colors hover:bg-white/5 hover:text-ink-100"
                  >
                    {link.label}
                  </a>
                ))}
                <a
                  href="#contact"
                  onClick={() => setOpen(false)}
                  className={`${btnPrimary} mt-3`}
                >
                  Start a project
                </a>
              </Container>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Burger({ open }: { open: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={open ? "M5 5l10 10M15 5L5 15" : "M3 6h14M3 10h14M3 14h14"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
