// Client-side search over /search-index.json.
// ponytail: 28 issues, ~150 KB of prose — Array.filter over one blob beats any
// index library here. Reassess past roughly 300 issues.
//
// The pure functions below are exported so scripts/search.test.js can run them
// in Node; the DOM wiring at the bottom is guarded so importing is side-effect
// free.

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
export function search(query, docs) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return docs
    .map((doc) => {
      let score = doc.text.split(q).length - 1;
      if (doc.topics.some((t) => t.toLowerCase().includes(q))) score += 100;
      if (doc.title.toLowerCase().includes(q)) score += 50;
      return { doc, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || (a.doc.date < b.doc.date ? 1 : -1))
    .map((r) => r.doc);
}

if (typeof document !== "undefined") {
  const form = document.querySelector("[data-search]");
  const input = form && form.querySelector("input");
  const list = document.querySelector("[data-search-results]");

  if (form && input && list) {
    let index = null;
    let loading = null;

    const escapeHtml = (s) =>
      String(s).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

    const row = (d) =>
      `<li class="issue-list__item"><a href="${d.url}">` +
      `<span class="issue-list__week">Week ${d.week}</span>` +
      `<span class="issue-list__title">${escapeHtml(d.title)}</span></a></li>`;

    const close = () => {
      list.hidden = true;
      list.innerHTML = "";
    };

    const render = () => {
      const q = input.value.trim();
      if (!q || !index) return close();
      let hits = search(q, index.docs);
      let note = "";
      if (!hits.length) {
        const fix = correct(q, index.terms);
        if (fix) {
          hits = search(fix, index.docs);
          note = `<li class="search__note">Showing results for ${escapeHtml(fix)}</li>`;
        }
      }
      list.innerHTML = hits.length
        ? note + hits.map(row).join("")
        : `<li class="search__note">No issues match ${escapeHtml(q)}</li>`;
      list.hidden = false;
    };

    const load = () => {
      // ponytail: fetched once, lazily. No debounce — scanning 28 docs is
      // sub-millisecond.
      loading ||= fetch("/search-index.json")
        .then((r) => r.json())
        .then((data) => { index = data; })
        .catch(() => { loading = null; });
      return loading;
    };

    input.addEventListener("focus", () => load().then(render), { once: true });
    input.addEventListener("input", render);
    // form-action 'none' in _headers blocks a real submit — never submit.
    form.addEventListener("submit", (e) => e.preventDefault());
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    document.addEventListener("click", (e) => { if (!form.contains(e.target)) close(); });
  }
}
