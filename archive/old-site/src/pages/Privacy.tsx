import { LegalLayout, LegalSection } from "../components/LegalLayout";
import { BRAND, EMAIL, LEGAL_ENTITY, LEGAL_LOCATION, MAILTO } from "../components/ui";

export function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="July 2026">
      <p>
        This policy explains what information {BRAND} (&ldquo;we,&rdquo;
        &ldquo;us&rdquo;) collects when you use this website, how we use it, and
        the choices you have. We keep data collection to the minimum needed to
        reply to you and run the site.
      </p>

      <LegalSection heading="Who we are">
        <p>
          {BRAND} is a web studio operated by {LEGAL_ENTITY}, based in{" "}
          {LEGAL_LOCATION}. You can reach us at{" "}
          <a href={MAILTO} className="text-amber underline underline-offset-2">
            {EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What we collect">
        <p>
          We only collect the information you choose to send us through our
          contact form: your name, business name, email address, and any project
          details you include. We do not use tracking cookies, advertising
          pixels, or third-party analytics that profile you.
        </p>
      </LegalSection>

      <LegalSection heading="How we use it">
        <p>
          We use your information solely to respond to your enquiry, prepare a
          quote, and communicate about your project. We never sell or rent your
          information, and we don&rsquo;t share it except with the service
          providers below who help us operate.
        </p>
      </LegalSection>

      <LegalSection heading="Service providers">
        <p>
          Form submissions are processed by <strong>Formspree</strong>, which
          delivers your message to us. If you make a payment, it is handled
          securely by <strong>Stripe</strong>, and we never receive or store
          your full card details. If you choose to finance a project, that
          financing is provided by a third party such as <strong>Affirm</strong>
          {" "}under its own terms. Our website is served by a static hosting
          provider, and fonts are loaded from <strong>Google Fonts</strong>,
          which may receive your IP address as part of delivering those fonts.
          Each provider processes data under its own privacy policy.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention">
        <p>
          We keep enquiry emails for as long as needed to serve you and meet our
          record-keeping obligations, then delete them. You can ask us to delete
          your information at any time.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          Depending on where you live, you may have the right to access,
          correct, or delete the personal information we hold about you, or to
          object to its processing. To exercise any of these, email us at{" "}
          <a href={MAILTO} className="text-amber underline underline-offset-2">
            {EMAIL}
          </a>{" "}
          and we&rsquo;ll respond promptly.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy as our practices evolve. The
          &ldquo;last updated&rdquo; date above reflects the most recent
          version.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
