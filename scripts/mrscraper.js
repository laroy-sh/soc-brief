// MrScraper wrapper — unblock auth-walled sources (LinkedIn, X) for brief research.
// Docs: https://docs.mrscraper.com/docs/getting-started/quickstart
// API: POST https://api.mrscraper.com  (x-api-token header, JSON body {url, prompt, agent})
// Server/build-side only — never expose the token to the browser.

const API_BASE = "https://api.mrscraper.com";

/**
 * Scrape a URL via MrScraper.
 * @param {string} url target page
 * @param {object} [opts]
 * @param {"markdown"|"html"|"screenshot"|"json"} [opts.format="markdown"]
 * @param {string} [opts.prompt] extraction instructions (required for format "json")
 * @param {boolean} [opts.superProxy=true] premium unblocking proxy (super=true)
 * @param {boolean} [opts.jsRender=true] browser-render the page (html=true)
 * @param {string} [opts.geoCode] proxy exit country, e.g. "US" or "DE"
 * @param {number} [opts.timeoutMs=180000]
 * @param {typeof fetch} [opts.fetchImpl] injectable for tests
 * @returns {Promise<string|object>} markdown/html/screenshot-url as string, or parsed data for "json"
 */
export async function scrape(url, opts = {}) {
  const {
    format = "markdown",
    prompt,
    superProxy = true,
    jsRender = true,
    geoCode,
    timeoutMs = 180_000,
    fetchImpl = fetch,
  } = opts;

  const token = process.env.MRSCRAPER_API_TOKEN;
  if (!token) throw new Error("MRSCRAPER_API_TOKEN is not set (get one at https://app.mrscraper.com/api-tokens)");
  if (!/^https?:\/\//.test(url)) throw new Error(`Not an http(s) URL: ${url}`);
  if (format === "json" && !prompt) throw new Error('format "json" requires opts.prompt');

  const qs = new URLSearchParams();
  if (superProxy) qs.set("super", "true");
  if (jsRender) qs.set("html", "true");
  const body = {
    url,
    agent: "general",
    prompt: prompt ?? "Return the full page content as complete as possible.",
  };
  if (geoCode) body.geo_code = geoCode; // ponytail: param name from CLI --geo-code; verify against API docs if geo ever misbehaves

  const res = await fetchImpl(`${API_BASE}?${qs}`, {
    method: "POST",
    headers: { "x-api-token": token, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`MrScraper HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  if (json.success === false) throw new Error(`MrScraper error: ${JSON.stringify(json).slice(0, 300)}`);

  switch (format) {
    case "markdown": return json.markdown ?? json.data;
    case "html": return json.html ?? json.data;
    case "screenshot": return json.screenshot;
    case "json": return json.data;
    default: throw new Error(`Unknown format: ${format}`);
  }
}

// CLI demo: node scripts/mrscraper.js <url> [--format markdown|html|screenshot|json] [--prompt "..."] [--geo DE] [--no-super] [--no-render]
const { pathToFileURL } = await import("node:url");
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { readFileSync, existsSync } = await import("node:fs");
  if (!process.env.MRSCRAPER_API_TOKEN && existsSync(new URL("../.env", import.meta.url))) {
    for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)=["']?([^"']*)["']?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
  const args = process.argv.slice(2);
  const url = args.find(a => !a.startsWith("--"));
  if (!url) { console.error("usage: node scripts/mrscraper.js <url> [--format f] [--prompt p] [--geo CC] [--no-super] [--no-render]"); process.exit(1); }
  const flag = name => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
  const out = await scrape(url, {
    format: flag("format") ?? "markdown",
    prompt: flag("prompt"),
    geoCode: flag("geo"),
    superProxy: !args.includes("--no-super"),
    jsRender: !args.includes("--no-render"),
  });
  console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
}
