import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  BRAND,
  Container,
  EMAIL,
  Eyebrow,
  FadeUp,
  MAILTO,
  btnPrimary,
  fieldBase,
} from "./ui";
import { Guarantee } from "./Guarantee";

/**
 * Formspree endpoint. This is a public form URL (not a secret), so it is
 * safe in front-end code.
 */
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzdlnbkj";
const FORM_CONFIGURED = !FORMSPREE_ENDPOINT.includes("your-form-id");

type Status = "idle" | "submitting" | "success" | "error";

const needs = ["New website", "Redesign", "Automation", "Not sure"];
const budgets = ["Under $1,500", "$1,500 to $3,000", "$3,000+", "Not sure yet"];
const timelines = ["As soon as possible", "1 to 3 months", "Just exploring"];
const sources = [
  "Search / Google",
  "Referral",
  "Social media",
  `Saw a ${BRAND} site`,
  "Other",
];

export function LeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  // Per-field inline errors. Native constraint validation stays on; we just
  // surface its message under the field instead of relying on the bubble.
  const [errs, setErrs] = useState<Record<string, string>>({});
  const handleInvalid = (e: FormEvent<HTMLInputElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    setErrs((p) => ({ ...p, [el.name]: el.validationMessage }));
  };
  const clearError = (name: string) =>
    setErrs((p) => {
      if (!p[name]) return p;
      const next = { ...p };
      delete next[name];
      return next;
    });

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot: if the hidden field is filled, silently "succeed".
    if (data.get("_gotcha")) {
      setStatus("success");
      return;
    }

    if (!FORM_CONFIGURED) {
      setStatus("error");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      if (res.ok) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="contact" className="scroll-mt-24 border-t border-hairline py-28 md:py-40">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          {/* Pitch */}
          <div>
            <FadeUp>
              <Eyebrow>Start here</Eyebrow>
            </FadeUp>
            <FadeUp delay={0.06}>
              <h2 className="mt-6 font-display text-4xl font-semibold tracking-[-0.02em] text-ink-100 md:text-5xl">
                Tell me about your project.
              </h2>
            </FadeUp>
            <FadeUp delay={0.1}>
              <p className="mt-5 max-w-md font-sans text-lg leading-relaxed text-ink-300">
                Or ask for a <span className="text-ink-100">free homepage teardown</span>.
                I&rsquo;ll record a short, no-pressure walkthrough of your current
                site and show you exactly what to fix. No obligation.
              </p>
            </FadeUp>
            <FadeUp delay={0.13}>
              <Guarantee className="mt-8" />
            </FadeUp>
            <FadeUp delay={0.16}>
              <p className="mt-8 font-mono text-sm tracking-wide text-ink-500">
                Prefer email?{" "}
                <a
                  href={MAILTO}
                  className="text-amber transition-colors hover:text-amber-bright"
                >
                  {EMAIL}
                </a>
              </p>
            </FadeUp>
          </div>

          {/* Form / success */}
          <FadeUp delay={0.12}>
            <div className="rounded-2xl border border-hairline bg-panel p-6 md:p-8">
              {status === "success" ? (
                <div
                  role="status"
                  className="flex min-h-[420px] flex-col items-center justify-center text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-phosphor/40 bg-phosphor/10 text-phosphor">
                    <CheckBig />
                  </div>
                  <h3 className="mt-6 font-display text-2xl font-semibold text-ink-100">
                    Message received.
                  </h3>
                  <p className="mt-3 max-w-sm font-sans text-ink-300">
                    Thank you. I&rsquo;ll get back to you within one
                    business day.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate={false}>
                  {/* Honeypot (hidden from users and assistive tech) */}
                  <input
                    type="text"
                    name="_gotcha"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="absolute left-[-9999px] h-0 w-0 opacity-0"
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Your name" htmlFor="name" required error={errs.name}>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        className={fieldBase}
                        onInvalid={handleInvalid}
                        onInput={() => clearError("name")}
                        aria-invalid={!!errs.name}
                        aria-describedby={errs.name ? "name-error" : undefined}
                      />
                    </Field>
                    <Field label="Business name" htmlFor="business">
                      <input
                        id="business"
                        name="business"
                        type="text"
                        autoComplete="organization"
                        className={fieldBase}
                      />
                    </Field>
                  </div>

                  <div className="mt-5">
                    <Field label="Email" htmlFor="email" required error={errs.email}>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        inputMode="email"
                        required
                        autoComplete="email"
                        className={fieldBase}
                        onInvalid={handleInvalid}
                        onInput={() => clearError("email")}
                        aria-invalid={!!errs.email}
                        aria-describedby={errs.email ? "email-error" : undefined}
                      />
                    </Field>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    <Field label="What do you need?" htmlFor="need">
                      <Select id="need" name="need" options={needs} />
                    </Field>
                    <Field label="Budget" htmlFor="budget">
                      <Select id="budget" name="budget" options={budgets} />
                    </Field>
                    <Field label="Timeline" htmlFor="timeline">
                      <Select id="timeline" name="timeline" options={timelines} />
                    </Field>
                    <Field label="How did you hear about us?" htmlFor="source">
                      <Select id="source" name="source" options={sources} />
                    </Field>
                  </div>

                  <div className="mt-5">
                    <Field label="Anything else?" htmlFor="message">
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        className={`${fieldBase} resize-y`}
                        placeholder="A few words about your business and what you're after."
                      />
                    </Field>
                  </div>

                  {status === "error" && (
                    <p role="alert" className="mt-5 text-sm text-danger">
                      {FORM_CONFIGURED
                        ? `Something went wrong sending your message. Please email ${EMAIL} instead.`
                        : `The form isn't connected to Formspree yet. Add your endpoint in LeadForm.tsx, or email ${EMAIL}.`}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting"}
                    className={`${btnPrimary} mt-7 w-full disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    {status === "submitting" ? "Sending…" : "Send message"}
                    {status !== "submitting" && <ArrowRight />}
                  </button>

                  <p className="mt-4 font-sans text-xs leading-relaxed text-ink-500">
                    Your details are sent securely to our form provider
                    (Formspree) and used only to reply to you. Never sold
                    or shared. See our{" "}
                    <a
                      href="#/privacy"
                      className="text-ink-300 underline underline-offset-2 hover:text-ink-100"
                    >
                      Privacy Policy
                    </a>
                    .
                  </p>
                </form>
              )}
            </div>
          </FadeUp>
        </div>
      </Container>
    </section>
  );
}

/* Field + Select primitives ---------------------------------------- */
function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-2 block font-sans text-[13px] font-medium text-ink-300"
      >
        {label}
        {required && <span className="ml-1 text-amber">*</span>}
      </label>
      {children}
      {error && (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="mt-1.5 font-sans text-[13px] text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Select({
  id,
  name,
  options,
}: {
  id: string;
  name: string;
  options: string[];
}) {
  return (
    <select id={id} name={name} defaultValue="" className={fieldBase}>
      <option value="" disabled>
        Select…
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function CheckBig() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
