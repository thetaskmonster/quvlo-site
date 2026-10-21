import { BRAND } from "./ui";

/**
 * Brand lockup: the Aperture-Q mark + the Quvlo wordmark.
 * The mark is the Q drawn as a lens, an ink ring with an amber tail,
 * and the wordmark closes on a matching amber period. Both colours are
 * fixed brand values (not themeable) by design.
 */
export function Wordmark({
  className = "",
  size = 22,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} />
      <span className="font-display text-lg font-semibold tracking-[-0.01em] text-ink-100">
        {BRAND}
        <span className="text-amber">.</span>
      </span>
    </span>
  );
}

/** Aperture-Q: the Q as a precision lens. Ink ring, amber tail. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7.5" stroke="#EEF0F3" strokeWidth="2" />
      <path
        d="M13.6 13.6 21 21"
        stroke="#F0A538"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
