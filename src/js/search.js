// Client-side search over /search-index.json. Pure functions only — the command
// palette in src/js/palette.js owns every bit of DOM, and scripts/search.test.js
// runs these directly in Node.
//
// ponytail: 34 issues, ~200 KB of prose — Array.filter over one blob beats any
// index library here, and beats a Web Worker too (a full pass is well under a
// frame, and the CSP would have to grow a worker-src to allow one). Reassess
// past roughly 300 issues.

// Levenshtein, two rows. Only ever run against the terms vocabulary.
export function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[b.length];
}

// Nearest vocabulary term, or null. ponytail: single tokens only —
// multi-word correction is a rabbit hole nobody here needs.
export function correct(query, terms) {
  const q = query.trim().toLowerCase();
  if (q.length < 4 || q.includes(" ")) return null;
  let bestDistance = (q.length >= 8 ? 2 : 1) + 1;
  let best = null;
  for (const t of terms) {
    if (Math.abs(t.length - q.length) >= bestDistance) continue;
    const d = distance(q, t);
    if (d < bestDistance) {
      bestDistance = d;
      best = t;
    }
  }
  return best;
}

// Topic hit 100, title hit 50, plus one point per body occurrence. At this
// corpus size BM25 would rank essentially identically.
// Folded body text, computed once per doc and cached on it.
export const folded = (doc) => (doc.textLower ||= doc.text.toLowerCase());

export function search(query, docs) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return docs
    .map((doc) => {
      let score = folded(doc).split(q).length - 1;
      if (doc.topics.some((t) => t.toLowerCase().includes(q))) score += 100;
      if (doc.title.toLowerCase().includes(q)) score += 50;
      return { doc, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (a.doc.date < b.doc.date ? 1 : -1))
    .map((r) => r.doc);
}

// The first body match with enough room either side to read it, split so the
// caller can mark the hit without running a regex over user input.
export function snippet(doc, query, radius = 90) {
  const q = query.trim().toLowerCase();
  const at = q ? folded(doc).indexOf(q) : -1;
  if (at === -1) return null;
  const from = Math.max(0, at - radius);
  const to = Math.min(doc.text.length, at + q.length + radius);
  return {
    before: (from > 0 ? "…" : "") + doc.text.slice(from, at),
    match: doc.text.slice(at, at + q.length),
    after: doc.text.slice(at + q.length, to) + (to < doc.text.length ? "…" : ""),
  };
}
