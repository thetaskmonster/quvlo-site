# Anew Dental of Denton: rebuild concept

An unsolicited redesign concept for the number one prospect on
[[prospects-batch-1]], built to be sent with the teardown video.

- `anew-dental-rebuild.html` is the deliverable. Self-contained, open it directly
  in a browser or host it anywhere.
- `build.mjs` regenerates it. Run `node build.mjs` from this folder.

## Where the content came from

Every fact on the page was read out of the practice's own live homepage
(`dentontexasdentist.com`) during the audit on 2026-07-24:

| Fact | Source |
|---|---|
| Trinh Pham, DDS | `MedicalBusiness` schema block on the homepage |
| (940) 565-5049 | homepage header and schema |
| 3100 Unicorn Lake Blvd, Suite 130, Denton, TX 76210 | schema `PostalAddress` |
| Hours, closed Wednesdays | schema `openingHoursSpecification` |
| Service list | the practice's own navigation and meta description |

Nothing is invented. There are no review counts, no star ratings, no years in
business, no patient numbers, and no testimonial copy anywhere on the page. The
two places that need real content the practice has to supply are marked with a
visible "Needs your content" panel instead of being filled with fiction.

## The four fixes it demonstrates

All four were verified against the served HTML, not assumed:

1. 11 links whose only text is "Read More" (WCAG 2.4.4, Level A)
2. A Google Maps iframe with no `title` (WCAG 4.1.2, Level A)
3. A phone number sitting as plain text rather than a `tel:` link
4. A legacy "upgrade your browser" prompt, which dates the template

Contrast, keyboard order, and a Lighthouse score are deliberately absent. Those
need a pass in a live browser and get recorded on camera rather than asserted.

## Measured on this page

- 18 text samples checked for contrast, worst 5.21:1 against a 4.5:1 target
- No horizontal overflow at 390 or 1440 CSS px
- No tap target under 24x24 outside the inline-link exception
- 0 generic links, 4 `tel:` links, 0 untitled iframes, 0 unlabelled inputs

## Before sending

The page carries a permanent bar naming it a concept by Quvlo and stating it is
not affiliated with or endorsed by the practice. Keep that bar. It is what makes
sending an unsolicited rebuild of a named business fair rather than misleading.

It is deliberately `noindex,nofollow` and is not published on quvlo.co.
