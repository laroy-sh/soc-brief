# soc-brief

Static archive of Microsoft Sentinel SOC/Security briefs, published via Cloudflare Pages.

- index.html - archive listing (newest first)
- briefs/ - one self-contained HTML file per brief
- _headers - Cloudflare Pages security headers

No build step. Pages serves the repo root as-is.

Weekly automation: a Claude Code cloud scheduled task generates
briefs/sentinel-soc-security-weekly-<window-start>.html each Monday,
prepends an entry to the list in index.html, and pushes to main.
Cloudflare Pages auto-deploys on push.
