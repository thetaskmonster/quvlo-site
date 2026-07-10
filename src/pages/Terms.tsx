import { LegalLayout, LegalSection } from "../components/LegalLayout";
import { BRAND, EMAIL, GOVERNING_LAW, MAILTO } from "../components/ui";

export function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="July 2026">
      <p>
        These terms govern your use of this website and, where applicable, the
        services {BRAND} (&ldquo;we,&rdquo; &ldquo;us&rdquo;) provides. By using
        this site or engaging us, you agree to them. Specific project work is
        also governed by the written proposal or agreement we sign with you,
        which takes precedence if there&rsquo;s any conflict.
      </p>

      <LegalSection heading="Our services">
        <p>
          {BRAND} designs and builds websites and related digital services.
          Descriptions and pricing on this site are starting points, not binding
          offers; every project is quoted individually in writing before work
          begins.
        </p>
      </LegalSection>

      <LegalSection heading="Quotes and payment">
        <p>
          Project fees, scope, and schedule are set out in your individual
          proposal. Unless stated otherwise there, work begins after a deposit,
          with the balance due before launch. Care Plans are billed monthly and
          can be cancelled at any time. Payments are processed by{" "}
          <strong>Stripe</strong>. Where offered, installment financing is
          provided by a third party such as <strong>Affirm</strong>, subject to
          its approval and terms.
        </p>
      </LegalSection>

      <LegalSection heading="Ownership">
        <p>
          On full payment, you own the final website we deliver for you:
          the design, the code, and your content are yours to keep, with no
          proprietary builder to stay locked into. We may retain rights to
          underlying tools, libraries, and techniques we reuse across projects,
          and we may show the finished work in our portfolio unless you ask us
          not to.
        </p>
      </LegalSection>

      <LegalSection heading="Your responsibilities">
        <p>
          You&rsquo;re responsible for the accuracy and rights to any content
          you provide (text, images, logos), and for ensuring it doesn&rsquo;t
          infringe anyone else&rsquo;s rights.
        </p>
      </LegalSection>

      <LegalSection heading="Warranties and liability">
        <p>
          We build carefully and stand behind our work, but this site and its
          content are provided &ldquo;as is&rdquo; without warranties of any
          kind. To the fullest extent permitted by law, {BRAND} is not liable
          for indirect or consequential damages arising from use of this site.
        </p>
      </LegalSection>

      <LegalSection heading="Governing law">
        <p>
          These terms are governed by the laws of {GOVERNING_LAW}, without
          regard to conflict-of-laws rules.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms? Email{" "}
          <a href={MAILTO} className="text-amber underline underline-offset-2">
            {EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
