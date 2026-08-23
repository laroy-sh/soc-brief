// Command palette: full-text search across every issue, plus jumps to the
// topics and pages, in one keyboard surface. ⌘K / Ctrl-K anywhere, or the
// masthead button.
//
// Built on <dialog>.showModal(), which brings the focus trap, the inert
// backdrop and Esc-to-close with it — none of that is worth reimplementing.

import { search, correct, snippet } from "./search.js";

const trigger = document.querySelector("[data-palette-open]");
const dialog = document.querySelector("[data-palette]");
if (trigger && dialog) {
  const input = dialog.querySelector("[data-palette-input]");
  const out = dialog.querySelector("[data-palette-results]");
  const mac = /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

  const PAGES = [
    { title: "Deadlines", url: "/deadlines/", hint: "every dated obligation" },
    { title: "Threats", url: "/threats/", hint: "actors and families covered" },
    { title: "KQL library", url: "/kql/", hint: "every featured hunting query" },
    { title: "Threat Intel", url: "/intel/", hint: "live dashboards" },
    { title: "Atom feed", url: "/feed.xml", hint: "subscribe" },
  ];

  let index = null;
  let loading = null;
  let rows = [];
  let at = -1;

  for (const el of document.querySelectorAll("[data-palette-key]")) {
    el.textContent = mac ? "⌘K" : "Ctrl K";
  }

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const load = () => {
    loading ||= fetch("/search-index.json")
      .then((r) => r.json())
      .then((data) => {
        index = data;
        index.topics = [...new Set(data.docs.flatMap((d) => d.topics || []))].sort();
      })
      .catch(() => { loading = null; });
    return loading;
  };

  const group = (label, items) =>
    items.length
      ? `<p class="palette__group">${esc(label)}</p><ul class="palette__list">${items.join("")}</ul>`
      : "";

  const option = (url, main, meta, snip) =>
    `<li><a class="palette__row" role="option" aria-selected="false" href="${esc(url)}">` +
    `<span class="palette__row-main">${main}</span>` +
    (meta ? `<span class="palette__row-meta">${esc(meta)}</span>` : "") +
    (snip ? `<span class="palette__row-snippet">${snip}</span>` : "") +
    `</a></li>`;

  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const empty = () =>
    group("Jump to", PAGES.map((p) => option(p.url, esc(p.title), p.hint))) +
    group(
      "Latest issues",
      index.docs.slice(-5).reverse().map((d) => option(d.url, esc(d.title), `Week ${d.week}`)),
    );

  const results = (q) => {
    let hits = search(q, index.docs);
    let shown = q;
    let note = "";
    if (!hits.length) {
      const fix = correct(q, index.terms);
      if (fix) {
        hits = search(fix, index.docs);
        shown = fix;
        note = `<p class="palette__note">Nothing matches ${esc(q)} — showing ${esc(fix)} instead.</p>`;
      }
    }
    const lower = q.toLowerCase();
    const topics = index.topics
      .filter((t) => t.toLowerCase().includes(lower))
      .map((t) => option(`/topics/${slug(t)}/`, esc(t), "topic"));
    const pages = PAGES
      .filter((p) => p.title.toLowerCase().includes(lower))
      .map((p) => option(p.url, esc(p.title), p.hint));
    const issues = hits.map((d) => {
      const s = snippet(d, shown);
      return option(
        d.url,
        esc(d.title),
        `Week ${d.week}`,
        s ? `${esc(s.before)}<mark>${esc(s.match)}</mark>${esc(s.after)}` : "",
      );
    });
    const body = group("Topics", topics) + group("Pages", pages) +
      group(`Issues · ${issues.length}`, issues);
    return note + (body || `<p class="palette__note">No issue mentions ${esc(q)}.</p>`);
  };

  const mark = (next) => {
    if (rows[at]) rows[at].setAttribute("aria-selected", "false");
    at = next;
    const row = rows[at];
    if (!row) return input.removeAttribute("aria-activedescendant");
    row.setAttribute("aria-selected", "true");
    row.id ||= `palette-row-${at}`;
    input.setAttribute("aria-activedescendant", row.id);
    row.scrollIntoView({ block: "nearest" });
  };

  const render = () => {
    if (!index) return;
    const q = input.value.trim();
    out.innerHTML = q ? results(q) : empty();
    rows = [...out.querySelectorAll(".palette__row")];
    at = -1;
    mark(rows.length ? 0 : -1);
  };

  const open = () => {
    if (dialog.open) return;
    dialog.showModal();
    input.select();
    (index ? Promise.resolve() : load()).then(render);
  };

  trigger.addEventListener("click", open);
  input.addEventListener("input", () => (index ? render() : load().then(render)));

  document.addEventListener("keydown", (e) => {
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      dialog.open ? dialog.close() : open();
    } else if (e.key === "/" && !inField && !dialog.open && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      open();
    }
  });

  dialog.addEventListener("keydown", (e) => {
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (step) {
      e.preventDefault();
      if (rows.length) mark((at + step + rows.length) % rows.length);
    } else if (e.key === "Enter" && rows[at]) {
      e.preventDefault();
      rows[at].click();
    }
  });

  // Clicking the backdrop closes; the dialog element itself fills the top of
  // the viewport, so a click outside its box is a click on the backdrop.
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => trigger.focus());
}
