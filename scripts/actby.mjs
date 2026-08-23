// Parse the `## Act by` sections out of the weekly issues into dated
// obligations, and collapse the same obligation repeated across weeks into one
// entry. Drives the deadline radar on the home page and /deadlines/.
//
// Pure functions, no Eleventy and no filesystem — scripts/actby.test.js runs
// them directly, eleventy.config.js feeds them raw markdown.

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const LINK = /\[([^\]]+)\]\((https?:[^)\s]+)\)/g;

// Words that carry no signal for telling two obligations apart.
const STOP = new Set([
  "the", "and", "for", "that", "with", "from", "this", "will", "are", "not",
  "you", "your", "its", "into", "than", "then", "but", "all", "any", "how",
  "microsoft", "azure", "date", "before", "after", "when", "what", "which",
]);

// "25 Aug 2026" → { iso, label }. "Jun 2026" and "Summer 2026" carry no day,
// so they stay unpinned rather than being guessed into a date.
export function parseDeadlineDate(raw) {
  const label = String(raw).trim();
  const m = label.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (!m) return { iso: null, label };
  const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (month === undefined) return { iso: null, label };
  const day = Number(m[1]);
  const d = new Date(Date.UTC(Number(m[3]), month, day));
  if (d.getUTCDate() !== day) return { iso: null, label };
  return { iso: d.toISOString().slice(0, 10), label };
}

// Distinctive tokens, crudely stemmed. "standardizes", "standardizing" and
// "standardization" all collapse to "standa", so one obligation described three
// different ways still matches itself.
function signature(text, source) {
  const out = new Set();
  for (const w of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length > 3 && !STOP.has(w)) out.add(w.slice(0, 6));
  }
  if (source) out.add(`url:${source}`);
  return out;
}

function overlap(a, b) {
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  return shared / Math.min(a.size, b.size);
}

// One issue's `## Act by` bullets. `md` is the raw markdown of a brief.
export function parseActBy(md) {
  const section = String(md).split("## Act by")[1];
  if (!section) return [];
  const body = section.split(/^## /m)[0];
  const out = [];
  for (const raw of body.split(/^- /m).slice(1)) {
    const item = raw.trim();
    const m = item.match(/^\*\*([^*]+)\*\*\s*[—–-]\s*([\s\S]+)$/);
    if (!m) continue;
    const text = m[2].replace(/\s+/g, " ").trim();
    const links = [...text.matchAll(LINK)];
    const last = links[links.length - 1];
    out.push({
      ...parseDeadlineDate(m[1]),
      // Markdown links become plain text; the citation travels separately so
      // the radar can always show it.
      text: text.replace(LINK, "$1").replace(/\s*\(([^()]*)\)\s*$/, "").trim(),
      source: last ? last[2] : null,
      sourceLabel: last ? last[1] : null,
    });
  }
  return out;
}

// Collapse repeats. Two bullets are the same obligation when they share a
// deadline and either cite the same page or describe the same thing. The most
// recent issue's wording wins, because it is the one written with the most
// knowledge of how the change actually landed.
//
// ponytail: same-date clustering only. A deadline that moves ("31 Mar 2027,
// extended from 1 Jul 2026") stays two entries — correct for the radar, since
// the superseded date passes and drops out on its own. Cross-date reconciliation
// only if a moved deadline ever needs to read as one tracked item.
export function collapseDeadlines(issues) {
  const sorted = [...issues].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const byDate = new Map();
  for (const issue of sorted) {
    for (const item of issue.items) {
      const key = item.iso || `label:${item.label.toLowerCase()}`;
      const clusters = byDate.get(key) || [];
      const sig = signature(item.text, item.source);
      const hit = clusters.find((c) => overlap(c.sig, sig) >= 0.35);
      if (hit) {
        hit.sig = sig;
        hit.text = item.text;
        hit.source = item.source || hit.source;
        hit.sourceLabel = item.sourceLabel || hit.sourceLabel;
        hit.issues.push(issue.ref);
      } else {
        clusters.push({ ...item, sig, issues: [issue.ref] });
      }
      byDate.set(key, clusters);
    }
  }
  const out = [];
  for (const clusters of byDate.values()) {
    for (const c of clusters) {
      const { sig, ...rest } = c;
      out.push({ ...rest, firstSeen: c.issues[0], lastSeen: c.issues[c.issues.length - 1] });
    }
  }
  // Dated first, in date order; undated obligations trail them.
  return out.sort((a, b) => {
    if (a.iso && b.iso) return a.iso.localeCompare(b.iso) || a.text.localeCompare(b.text);
    if (a.iso) return -1;
    if (b.iso) return 1;
    return a.label.localeCompare(b.label);
  });
}

// overdue | due (inside `soonDays`) | ahead | undated. Recomputed in the browser
// so a deadline does not read as upcoming days after it passed.
export function deadlineStatus(iso, todayIso, soonDays = 30) {
  if (!iso) return "undated";
  if (iso < todayIso) return "overdue";
  const days = Math.round((Date.parse(iso) - Date.parse(todayIso)) / 864e5);
  return days <= soonDays ? "due" : "ahead";
}
