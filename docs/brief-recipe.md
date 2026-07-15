# SOC Weekly Brief — sourcing & format recipe

Stage-1 artifact. This is the agreed standard for how every issue is produced —
by a human, by the backfill agents, and by the weekly scheduled task. It is
intentionally a plain doc for now; once a few live weekly runs prove it out, it
gets hardened into a reusable `soc-brief` skill (see "Staged plan" below).

## Destination

A standardized, trustworthy recipe for the brief — its sources, date-pinning
method, scope, and format — captured now as this doc and later as a skill, so
the backfill and the weekly task both produce consistent issues an intern can
read as ground truth.

## Decisions

- **Scope** — Microsoft security operations. Core: Sentinel; Defender XDR and
  its workloads (MDE, MDO, MDC, MDI, Defender for Cloud Apps); Entra ID
  Protection, Conditional Access, identity security. Also in scope:
  security-relevant features in adjacent Microsoft/Azure services even when the
  service is not a pure security product — Entra and Microsoft 365 features with
  a security/audit angle, Purview (audit/eDiscovery/DLP), Exchange Online
  Protection, Azure platform security (Key Vault, Firewall, network security),
  Security Copilot. Out: non-Microsoft clouds, pure product news with no security
  angle, generic third-party CVE roundups.
- **Date-pinning = dated posts as the spine.** The authoritative date of an item
  is the publication date of a *dated post* — a Microsoft Tech Community blog,
  the Microsoft Security Blog, the MSRC blog, or the Entra blog. Assign the item
  to the week whose window contains that date. Learn "what's new" pages are
  month-granular: use them for coverage/detail, but an item that appears *only*
  on a Learn page may be included only if a date can be corroborated; if it
  can't be pinned to a week, drop it. Never invent a date or a link.
- **Cadence** — weekly only, no monthly. Issue dated the closing Monday, covers
  the trailing 7 days. (Week helpers/calendar are shared with the awssec sibling.)
- **Length** — no character cap (the awssec sibling is capped at 3000 chars by
  LinkedIn; this site is not). Be as full as the real news warrants; a quiet week
  is a short issue. Never pad.

## Sources

Dated spine (primary — real dates):
- Microsoft Sentinel blog — https://techcommunity.microsoft.com/category/microsoftsentinel/blog/microsoftsentinelblog
- Microsoft Defender XDR blog — https://techcommunity.microsoft.com/category/microsoft-defender-xdr/blog/microsoftthreatprotectionblog
- Microsoft Entra blog — https://techcommunity.microsoft.com/category/microsoft-entra/blog/microsoft-entra-blog
- Microsoft Security Blog — https://www.microsoft.com/en-us/security/blog/
- MSRC blog + Patch Tuesday — https://msrc.microsoft.com/blog/ · https://msrc.microsoft.com/update-guide

Month-context (detail; attach to the announcement week):
- Sentinel what's new — https://learn.microsoft.com/en-us/azure/sentinel/whats-new (+ /whats-new-archive)
- Defender XDR what's new — https://learn.microsoft.com/en-us/defender-xdr/whats-new
- MDE what's new — https://learn.microsoft.com/en-us/defender-endpoint/whats-new-in-microsoft-defender-endpoint
- MDO what's new — https://learn.microsoft.com/en-us/defender-office-365/defender-for-office-365-whats-new
- MDC release notes — https://learn.microsoft.com/en-us/azure/defender-for-cloud/release-notes
- Entra what's new — https://learn.microsoft.com/en-us/entra/fundamentals/whats-new

Curated roundup (discovery aid — a dated weekly digest; use it to catch items the
first-party feeds buried, then cite the Microsoft primary source for each change,
never the newsletter itself):
- "THE PROMPT for Microsoft Security" (Rod Trent) — https://rodtrent.substack.com/s/the-prompt-for-microsoft-security (weekly). Moved here from microsoftdefender.substack.com, which stays up temporarily during the transition — check the new home first.
- David Alonso Dominguez (Microsoft, Senior Technical Security Specialist) — Sentinel/Defender XDR content, mostly on LinkedIn. Machine-fetchable channel: YouTube Atom feed https://www.youtube.com/feeds/videos.xml?channel_id=UC1IYsYLFOZxQrYD1Be-XIoA (plain XML, no auth). His LinkedIn (https://www.linkedin.com/in/david-alonso-dominguez/) and X (https://x.com/Davidal52214920) are behind auth walls — do not attempt to fetch them from the routine; use the YouTube feed only.

## File format

```
---
title: "June 8 – June 15, 2026"     # trailing window, en dash with spaces
date: 2026-06-15                     # the closing Monday
topics: ["Sentinel", "Defender XDR", "Entra ID"]   # 3–7 short tags
description: "One or two plain sentences. No markdown, no double-quotes inside."
---

## Act by
Only when the window has deadlines/enforcement dates. Bullets:
- **1 Jul 2026** — what happens and what to do. ([Source](url))

## What changed
Always present. One paragraph per item, blank line between. 2–4 sentences: what
shipped (GA / preview / deprecation / rename) and why it matters on shift. End
every paragraph with an inline link to the primary source. 4–8 items typical.

## Worth knowing
Optional. 1–3 short context paragraphs (portal-migration drumbeat, Microsoft
threat research, Patch Tuesday relevant to a Microsoft estate). Same link rule.
```

Topics tag vocabulary: Sentinel, Defender XDR, MDE, MDO, MDC, MDI, Entra ID,
KQL, Defender portal, UEBA, SOAR, Threat intel, Exposure management, Security
Copilot, Purview, M365. (Use M365 for Microsoft 365 platform features — Teams,
Exchange Online, M365 Copilot, SharePoint — not for the Defender workloads.)

Hard rules: every item traces to a fetched page with a real in-window date; one
item appears in exactly one issue; the markdown body is not run through a
template engine, so KQL braces `{ }` are safe.

**NO BOLD.** Never use `**bold**` in the body. The ONLY allowed bold is the
leading deadline date in an "## Act by" bullet — e.g. `- **1 Jul 2026** — …`.
Do NOT bold item lead-ins, product/feature names, CVE IDs, rollout dates, or
anything in "## What changed" or "## Worth knowing". Section headings are `##`
(not bold). This is a hard, non-negotiable author preference — bold anywhere
else is a defect.

## Staged plan (doc → skill)

1. **Now** — this doc is the standard; the Jan–Jul 2026 backfill was generated
   against it (one agent per week).
2. **Prove it** — going-forward weekly issues run against this doc, deploying to
   a preview URL for a human skim before production, for the first few weeks.
   Note here whatever the recipe gets wrong (bad date pins, scope creep, thin
   weeks handled poorly).
3. **Harden** — once it's consistently clean, fold this doc into a `soc-brief`
   skill (SKILL.md = this recipe) that both the scheduled task and manual runs
   invoke, and let the task deploy straight to production.
