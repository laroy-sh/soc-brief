# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four confirmed audiences, all reading the same weekly issue:

- SOC analysts and interns on shift — the primary case. They read at the start of the week to learn what changed in the Microsoft security stack and what they are on the hook to act on.
- The author, as personal reference and recall — the archive is a working knowledge base, not just a publishing record.
- Peers and practitioners who find it publicly — the site is public at soc-brief.pages.dev and reaches the wider Microsoft-security community.
- The author's own colleagues, briefed each week against shared tooling.

Reading skill is deliberately wide: an intern must be able to read an issue as ground truth without a senior translating it.

## Product Purpose

A weekly read on what's new across the Microsoft security stack — Sentinel, Defender (XDR, MDE, MDO, MDC, MDI, Defender for Cloud Apps), Entra, and security-relevant changes in the wider Microsoft/Azure estate — distilled into one issue per week.

Success, in priority order:

1. The reader acts on the deadlines. Nobody misses a retirement date, a KEV due date, or an exploited CVE. `## Act by` is the section that must never be missed.
2. The reader understands the week in full. A genuine read-through leaves them knowing what shipped and why it matters, not just that it shipped.
3. The reader finds what they came back for. The archive carries durable value through search, topic tags, and the week calendar.

## Positioning

First-party sourcing with a hard date spine. Every item is pinned to the publication date of a dated Microsoft post — Tech Community, Microsoft Security Blog, MSRC, Entra blog, Azure Updates — and assigned to the week whose window contains that date. Learn "what's new" pages are month-granular and are used for coverage and detail only; an item that cannot be pinned to a week is dropped rather than guessed. Community roundups (Rod Trent's "THE PROMPT for Microsoft Security", Security Blog Search, practitioner feeds) are discovery aids only; the citation is always the Microsoft primary source.

The result is a brief an analyst can treat as ground truth, which a generic CVE roundup or an undated vendor digest cannot claim.

## Operating Context

- Weekly cadence, no monthly edition. Each issue is dated its closing Monday and covers the trailing seven days.
- Issues live at `src/briefs/<closing-monday>-week.md`; the week calendar, tag cloud, and prev/next navigation all derive from the file's `date` and `topics`.
- The week/calendar convention is shared with a sibling project (awssec), so the two stay comparable.
- A weekly cloud routine researches the trailing week against `docs/brief-recipe.md`, writes the issue, builds, and publishes.
- Publishing: Eleventy v3 static build, GitHub repo `laroy-sh/soc-brief`, deployed to Cloudflare Pages at soc-brief.pages.dev; push to `main` auto-deploys production, pull requests get preview URLs.
- Reading happens at the top of a shift and on the archive later — both matter.

## Capabilities and Constraints

- Sections per issue: `## Act by` (dated obligations), `## What changed`, `## Worth knowing`, plus a dated KQL detection-content section.
- No length cap. A quiet week is a short issue; padding is prohibited.
- Every claim carries an inline link to its first-party source. Citations must stay visible in any design, never collapsed or hidden behind interaction alone.
- Scope, in: Sentinel; Defender XDR and its workloads; Entra identity security; security-relevant Microsoft 365, Purview, Exchange Online Protection, Azure platform security (Key Vault, Firewall, network security); Security Copilot. Out: non-Microsoft clouds, product news with no security angle, generic third-party CVE roundups.
- Existing surfaces: home (latest issue + week calendar), per-issue pages, topic pages, tag cloud, client-side search over a generated index, a KQL page, and an embedded threat-intel dashboard page.
- Node 20, Eleventy v3, plain CSS in a single `src/css/style.css`, no framework. Cloudflare Pages security headers ship from `src/_headers`.
- `docs/brief-recipe.md` is the binding editorial standard and outranks any later convenience.

## Brand Commitments

- Name: SOC Weekly Brief. Tagline: "The week in the Microsoft security stack, distilled." Kicker: "Sentinel · Defender · Entra".
- Voice: plain, declarative, analyst-to-analyst. Explains why a change matters operationally rather than restating a release note. No marketing register, no hype.
- No bold in prose. Bold is reserved for headings and deadline dates in `## Act by`.
- Author byline is Laroy Shtotland with a LinkedIn link — present today, but not declared a binding constraint on future design.
- The current dark "SOC console" theme is explicitly not a commitment. The user did not pin it; the stylesheet itself calls it interim. Treat it as incumbent evidence, replaceable.

## Evidence on Hand

- 34 real weekly issues in `src/briefs/`, spanning January through August 2026 — genuine sourced content, not placeholder.
- `docs/brief-recipe.md`: the full sourcing, date-pinning, scope, and format standard, including live source URLs.
- Real topic taxonomy driving the tag cloud and topic pages, derived from issue front matter.
- No testimonials, no customer logos, no usage metrics, no subscriber counts, no pricing, and no license terms exist. Future work must not fabricate any of these.

## Product Principles

1. Deadlines outrank everything. If a reader takes one thing from an issue, it is the dated obligation.
2. Sourced or dropped. An item that cannot be pinned to a dated first-party Microsoft post does not appear, and the link travels with the claim.
3. Readable by an intern, useful to a senior. One issue serves both; no separate tiers.
4. Length follows the news. Never pad a quiet week, never truncate a heavy one.
5. The archive is a product, not an exhaust. Search, tags, and the calendar are load-bearing, not decoration.

## Accessibility & Inclusion

No product-specific standard was established. The incumbent implementation carries a skip link, so that baseline is preserved rather than regressed.
