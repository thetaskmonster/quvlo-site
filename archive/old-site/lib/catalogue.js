/**
 * The Quvlo product catalogue.
 *
 * This is the ONLY place a price is defined, and it lives server side on
 * purpose. The browser sends a package key and nothing else: never an amount,
 * never a percentage. If the client could name its own price, someone would,
 * and they would name a low one.
 *
 * Amounts are integer cents to keep floating point out of money.
 */

export const DEPOSIT_PERCENT = 50;

export const PACKAGES = {
  landing: {
    key: 'landing',
    name: 'Landing Page',
    blurb: 'One page, engineered to turn visitors into calls.',
    totalCents: 150000,          // $1,500
    includes: [
      'Custom single-page design',
      'Lead capture wired to a trusted service',
      'WCAG 2.1 AA and agent-ready build',
      'You own the code and the content',
    ],
  },
  business: {
    key: 'business',
    name: 'Business Site',
    blurb: 'A complete presence that makes you the obvious choice.',
    totalCents: 300000,          // $3,000
    includes: [
      'Up to 5 custom pages',
      'SEO foundations and copy guidance',
      'WCAG 2.1 AA and agent-ready build',
      'You own the code and the content',
    ],
  },
};

/** Half today, half on completion, with the odd cent landing on the deposit. */
export function split(totalCents) {
  const deposit = Math.round((totalCents * DEPOSIT_PERCENT) / 100);
  return { totalCents, depositCents: deposit, balanceCents: totalCents - deposit };
}

export const money = (cents) =>
  '$' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Public shape for the browser. Note it carries amounts for DISPLAY only; the
 *  server recomputes everything from PACKAGES when it creates a session. */
export function publicCatalogue() {
  return Object.values(PACKAGES).map((p) => {
    const s = split(p.totalCents);
    return {
      key: p.key,
      name: p.name,
      blurb: p.blurb,
      includes: p.includes,
      total: money(s.totalCents),
      deposit: money(s.depositCents),
      balance: money(s.balanceCents),
      depositPercent: DEPOSIT_PERCENT,
    };
  });
}
