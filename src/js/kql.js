// Client-side filtering for /kql/: free-text over the whole entry, plus one
// active table tag. Everything is already in the DOM, so no index is needed.
const list = document.querySelector("[data-kql-list]");
if (list) {
  const entries = [...list.querySelectorAll(".kql-entry")];
  const input = document.querySelector("[data-kql-search]");
  const tags = [...document.querySelectorAll("[data-kql-tables] [data-table]")];
  const count = document.querySelector("[data-kql-count]");
  const empty = document.querySelector("[data-kql-empty]");
  const total = entries.length;
  // Cache the searchable text now: the copy-button script adds "kql / Copy"
  // chrome inside every <pre>, which would otherwise match every entry.
  const haystack = new Map(
    entries.map((el) => [
      el,
      [...el.querySelectorAll(".kql-entry__title, p, code")]
        .map((n) => n.textContent)
        .join(" ")
        .toLowerCase(),
    ])
  );
  let table = "";

  const apply = () => {
    const term = input.value.trim().toLowerCase();
    let shown = 0;
    for (const el of entries) {
      const okTable = !table || el.dataset.tables.split(" ").includes(table);
      const okTerm = !term || haystack.get(el).includes(term);
      const show = okTable && okTerm;
      el.hidden = !show;
      if (show) shown++;
    }
    empty.hidden = shown > 0;
    count.textContent =
      shown === total
        ? `${total} queries featured across the weekly issues.`
        : `${shown} of ${total} queries${table ? ` using ${table}` : ""}${term ? ` matching “${input.value.trim()}”` : ""}.`;
  };

  input.addEventListener("input", apply);
  for (const tag of tags) {
    tag.addEventListener("click", () => {
      table = tag.dataset.table === table ? "" : tag.dataset.table;
      for (const t of tags) t.classList.toggle("is-active", t.dataset.table === table);
      apply();
    });
  }
}
