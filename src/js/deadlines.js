// Deadline status against the reader's clock, not the build's.
//
// The site rebuilds weekly, so a page can sit for six days with a countdown
// that was right when it shipped. Everything dated carries its ISO date in the
// markup; this recomputes the wording on load and marks anything that has since
// passed. It also stamps a status onto the `## Act by` bullets inside an issue,
// which are plain markdown and cannot carry the data attribute themselves.

const DAY = 864e5;
const SOON = 30;

const todayIso = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toLocaleDateString("en-CA");
};

const statusFor = (iso, today) => {
  if (!iso) return "undated";
  if (iso < today) return "overdue";
  return Math.round((Date.parse(iso) - Date.parse(today)) / DAY) <= SOON ? "due" : "ahead";
};

const countdown = (iso, today) => {
  const days = Math.round((Date.parse(iso) - Date.parse(today)) / DAY);
  if (days === 0) return "today";
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  return `${-days} day${days === -1 ? "" : "s"} ago`;
};

// "25 Aug 2026" at the head of an Act by bullet.
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function isoFromLabel(label) {
  const m = String(label).trim().match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
  if (month < 0) return null;
  const d = new Date(Date.UTC(+m[3], month, +m[1]));
  return d.getUTCDate() === +m[1] ? d.toISOString().slice(0, 10) : null;
}

const LABEL = { overdue: "passed", due: "due soon", ahead: "ahead", undated: "no fixed date" };

function run() {
  const today = todayIso();

  // Radar pins and /deadlines/ rows.
  document.querySelectorAll("[data-iso]").forEach((el) => {
    const iso = el.dataset.iso;
    if (!iso) return;
    el.dataset.status = statusFor(iso, today);
    const since = el.querySelector("[data-radar-in], [data-deadline-in]");
    if (since) since.textContent = countdown(iso, today);
  });

  // Act by bullets inside an issue: the date is bold, per the house style, so
  // the status chip goes beside it without touching the prose or its citation.
  document.querySelectorAll(".prose h2").forEach((h) => {
    if (h.textContent.trim().toLowerCase() !== "act by") return;
    const list = h.nextElementSibling;
    if (!list || list.tagName !== "UL") return;
    list.classList.add("act-by");
    list.querySelectorAll(":scope > li").forEach((li) => {
      const strong = li.querySelector("strong");
      if (!strong || strong !== li.firstElementChild) return;
      const iso = isoFromLabel(strong.textContent);
      const status = statusFor(iso, today);
      li.dataset.status = status;
      const chip = document.createElement("span");
      chip.className = "act-by__chip";
      chip.textContent = iso ? `${LABEL[status]} · ${countdown(iso, today)}` : LABEL.undated;
      strong.after(chip);
    });
  });

  // The home summary counts what is still ahead; a deadline that passed since
  // the build must not still be counted as coming.
  const summary = document.querySelector("[data-radar-summary]");
  const marks = [...document.querySelectorAll(".radar__mark")];
  if (summary && marks.length) {
    const ahead = marks.filter((m) => m.dataset.status !== "overdue");
    const next = ahead[0] || marks[0];
    const label = next.querySelector(".radar__card-date b");
    summary.innerHTML =
      `${ahead.length} obligation${ahead.length === 1 ? "" : "s"} still ahead — the next falls on ` +
      `<b>${label ? label.textContent : summary.dataset.nextLabel}</b>. ` +
      `<a href="/deadlines/">Every deadline &rarr;</a>`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
