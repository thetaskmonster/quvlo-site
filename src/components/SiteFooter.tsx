import type { ReactNode } from "react";
import { BRAND, Container, EMAIL, MAILTO, SOCIALS } from "./ui";
import { Wordmark } from "./Wordmark";

const YEAR = new Date().getFullYear();

const footerNav = [
  { href: "#work", label: "Work" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
  { href: "#contact", label: "Contact" },
];

const legalNav = [
  { href: "#/privacy", label: "Privacy Policy" },
  { href: "#/terms", label: "Terms of Service" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <Container className="py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8">
          {/* Identity */}
          <div>
            <a href="#/" className="inline-flex items-center">
              <Wordmark />
            </a>
            <p className="mt-4 max-w-xs font-sans text-sm leading-relaxed text-ink-300">
              A precision web studio building custom sites that make small
              businesses look established.
            </p>
            <a
              href={MAILTO}
              className="mt-5 inline-block font-mono text-sm tracking-wide text-amber transition-colors hover:text-amber-bright"
            >
              {EMAIL}
            </a>
          </div>

          {/* Navigate */}
          <nav aria-label="Footer">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500">
              Explore
            </h2>
            <ul className="mt-4 space-y-3">
              {footerNav.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="font-sans text-sm text-ink-300 transition-colors hover:text-ink-100"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Legal + social */}
          <div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-500">
              Company
            </h2>
            <ul className="mt-4 space-y-3">
              {legalNav.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="font-sans text-sm text-ink-300 transition-colors hover:text-ink-100"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            {SOCIALS.length > 0 && (
              <div className="mt-5 flex items-center gap-3">
                {SOCIALS.map((s) => (
                  <SocialLink
                    key={s.platform}
                    href={s.href}
                    label={`${BRAND} on ${SOCIAL_LABEL[s.platform]}`}
                  >
                    {SOCIAL_ICON[s.platform]}
                  </SocialLink>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Baseline */}
        <div className="mt-12 flex flex-col gap-3 border-t border-hairline pt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 md:flex-row md:items-center md:justify-between">
          <span>&copy; {YEAR} {BRAND}. All rights reserved.</span>
          <span>Precision web studio · Built, not templated.</span>
        </div>
      </Container>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-hairline text-ink-300 transition-colors hover:border-ink-500 hover:text-ink-100"
    >
      {children}
    </a>
  );
}

const SOCIAL_LABEL = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  x: "X",
} as const;

const SOCIAL_ICON = {
  instagram: <IconInstagram />,
  tiktok: <IconTikTok />,
  linkedin: <IconLinkedIn />,
  x: <IconX />,
} as const;

function IconInstagram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}
function IconLinkedIn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconTikTok() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13.5 3v11.2a3.3 3.3 0 1 1-2.6-3.23" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 4.2A5 5 0 0 0 18.5 8.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
