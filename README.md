# SOC Weekly Brief

A small static site: a weekly read on what's new across the Microsoft security
stack — Sentinel, Defender (XDR/MDE/MDO/MDC/MDI), Entra, and security-relevant
changes in the wider Microsoft/Azure estate — written for SOC analysts and
interns. Published to soc-brief.pages.dev.

Built with [Eleventy](https://www.11ty.dev/) v3. Ported from the awssec sibling
project, so the two share one week/calendar convention.

## Layout

- `src/briefs/<closing-monday>-week.md` — one issue per week. Dated the Monday
  that closes the trailing 7-day window it covers.
- `src/_includes/` — `base.njk`, `brief.njk`, `calendar.njk` templates.
- `src/index.njk` — home: latest issue + the week-number calendar.
- `src/css/style.css` — the whole theme (interim "SOC console" look).
- `src/_headers` — Cloudflare Pages security headers (passed through to root).
- `eleventy.config.js` — week helpers + the `calendars` collection.
- `docs/brief-recipe.md` — how an issue is sourced, dated, scoped, and formatted.

## Develop

```
nvm use            # Node 20
npm install
npm run serve      # local preview at http://localhost:8080
npm run build      # writes _site/
```

## Deploy

Cloudflare Pages **direct upload** — a `git push` does NOT auto-deploy.

```
npm run build
npm run deploy     # wrangler pages deploy _site --project-name soc-brief
```

## Writing an issue

Add `src/briefs/<closing-monday>-week.md` following `docs/brief-recipe.md`:
sectioned body (`## Act by` / `## What changed` / `## Worth knowing`), every
item linked to its first-party Microsoft source, dated inside the week window.
The calendar and prev/next nav update automatically from the file's `date`.

## Weekly automation

A Claude Code scheduled task researches the trailing week against the sources in
`docs/brief-recipe.md`, writes the markdown issue, builds, and deploys. During
the proving period it deploys to a preview URL and pings for review before
production. See `docs/brief-recipe.md` for the current stage.
