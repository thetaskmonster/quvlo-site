import { Container } from "./ui";

/* Honest standards, not fabricated client logos. */
const principles = [
  "Hand-coded, no templates",
  "Performance-first",
  "Accessible by default",
  "Yours to own",
];

export function Principles() {
  return (
    <section className="border-y border-hairline bg-panel/30">
      <Container className="grid grid-cols-2 md:grid-cols-4">
        {principles.map((item) => (
          <div
            key={item}
            className="flex items-center justify-center px-4 py-7 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 md:py-9"
          >
            {item}
          </div>
        ))}
      </Container>
    </section>
  );
}
