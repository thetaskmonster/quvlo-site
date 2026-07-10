# CLAUDE.md — Project Rules
### Auto-loaded by Claude Code at the start of every session. These are standing rules for all of Kyle's web projects.

## About these rules
Follow every rule below on every task in this project without being reminded. If a request would violate one, say so and propose the safe version instead of just complying.

---

## SECURITY RULES (non-negotiable)

1. **Static by default.** Build marketing and landing pages as static HTML/CSS/JS. Do NOT add a database, server-side code, login system, or payment handling unless I explicitly ask. If a feature seems to need a backend, stop and tell me; we route it to a trusted service (Formspree for forms, Calendly for booking, Stripe's hosted checkout for payments) instead of hand-writing it.

2. **Never put secrets in front-end code.** No API keys, tokens, passwords, or credentials anywhere in a webpage's HTML, CSS, or JS. Anything in a front-end file is publicly visible. If a secret is ever needed, it goes in the host's environment variables, never in the code. Flag it if you see one.

3. **Sanitize every input.** Any form field, URL parameter, or user-supplied value must be treated as untrusted. Escape output, validate input, never inject raw user data into the page (no innerHTML with unescaped input).

4. **Minimal dependencies, official sources only.** Every external script, library, or component is a risk. Add one only if it's genuinely needed, and only from its official source (official CDN, verified npm package, 21st.dev, higgsfield.ai). Never from a random link, mirror, or DM'd file. State the source and reason for each dependency you add.

5. **No dangerous commands without asking.** Never run destructive shell commands (rm -rf, curl | sh, chmod on system paths) or pipe internet content directly into execution without showing me first and getting a yes.

6. **Assume everything ships public.** Write every line as if a stranger will read the source, because on a live site they can.

---

## QUALITY RULES

7. **Small, reviewable changes.** Keep each task scoped small enough that I can actually read the diff. Don't expand scope beyond what I asked. If you think something extra is needed, propose it separately.

8. **Explain what you're doing.** Before a big change, tell me the plan in plain language. After, tell me what you changed and why. No silent edits.

9. **One dependency, one reason.** Every package or library added gets a one-line justification.

10. **Ask before expensive-to-reverse decisions.** Stack choice, hosting, domain, anything hard to undo — pause and confirm. Otherwise make the reasonable call and tell me what you decided.

---

## DESIGN RULES

11. **Plan before building.** For any new page, produce the design plan first (subject, palette, type, signature element) and get my approval before writing code. The plan is what separates a $500 site from a $10k one.

12. **No AI-default aesthetics.** Avoid the three tells: cream + terracotta, near-black + acid-green, broadsheet hairlines. Derive palette and type from the specific business, not generic defaults.

13. **Motion must mean something.** Animation should express the product's logic, never float decoratively.

---

## COST RULES

14. **Efficient by default.** Prefer the lightest solution that ships: single self-contained files, free static hosting, no framework unless the feature list truly needs one. Cheaper to run and easier to host beats clever.

15. **Flag cost before adding it.** Anything that introduces recurring cost (paid API, paid host, paid service) gets called out before it goes in, with the cheaper alternative if one exists.

---

## BEFORE ANY SITE GOES LIVE
Run the full pre-launch checklist (see PRE-LAUNCH-CHECKLIST.md). Nothing ships without passing the security gate. When I say "run the launch checklist," perform every item and report pass/fail with fixes.
