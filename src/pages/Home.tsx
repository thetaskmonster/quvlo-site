import { Hero } from "../components/Hero";
import { Principles } from "../components/Principles";
import { CtaBand } from "../components/CtaBand";
import { Work } from "../components/Work";
import { ScrollStory } from "../components/ScrollStory";
import { Approach } from "../components/Approach";
import { Services } from "../components/Services";
import { Pricing } from "../components/Pricing";
import { Metrics } from "../components/Metrics";
import { FounderQuote } from "../components/FounderQuote";
import { FAQ } from "../components/FAQ";
import { LeadForm } from "../components/LeadForm";

export function Home() {
  return (
    <>
      <Hero />
      <Principles />

      {/* Step 1, low-friction entry, right after the hero */}
      <CtaBand
        eyebrow="Step 1 · Free & no pressure"
        heading="See exactly what's costing you customers."
        sub="A short, honest teardown of your current homepage: what's working, what's quietly losing you calls, and what to fix first. No cost, no pitch."
        cta="Get my free teardown"
      />

      <Work />

      {/* Step 2, after the work */}
      <CtaBand
        eyebrow="Step 2 · Your build"
        heading="Let's build the site your business deserves."
        sub="One that makes you look established, earns trust on first sight, and turns more of your visitors into calls and customers."
        cta="Start your project"
      />

      <ScrollStory />
      <Approach />
      <Services />
      <Pricing />

      {/* After pricing, close, echoing the guarantee */}
      <CtaBand
        eyebrow="Ready when you are"
        heading="Fixed price. Nothing to lose."
        sub="You approve the design direction before we build. If it's not right, you walk, with no charge beyond the deposit. Let's talk about what you're building."
        cta="Book your build"
      />

      <Metrics />
      <FounderQuote />
      <FAQ />
      <LeadForm />
    </>
  );
}
