// KQL syntax highlighting and Defender deep links, both done at build time so
// the browser gets plain HTML and one anchor — no highlighter library, no
// client-side work, and nothing new for the CSP to allow.
//
// The tokenizer is deliberately small. KQL only needs comments, strings,
// numbers, the pipe spine, operators and known table names to read well; the
// rest is left alone rather than guessed at.

import { gzipSync } from "node:zlib";

const KEYWORDS = new Set([
  "and", "as", "asc", "between", "by", "case", "contains", "count", "datatable",
  "desc", "distinct", "endswith", "evaluate", "extend", "externaldata", "find",
  "fork", "getschema", "has", "hasprefix", "hassuffix", "in", "invoke", "join",
  "kind", "let", "limit", "lookup", "make-series", "materialize", "mv-apply",
  "mv-expand", "on", "or", "order", "parse", "parse-where", "print", "project",
  "project-away", "project-keep", "project-rename", "project-reorder", "range",
  "reduce", "render", "sample", "scan", "search", "serialize", "set", "sort",
  "startswith", "step", "summarize", "take", "top", "top-nested", "union",
  "where", "matches", "regex", "not", "has_any", "has_all", "todynamic",
  "tostring", "toscalar", "tolower", "toupper", "ago", "now", "bin", "startofday",
  "datetime", "timespan", "dynamic", "isnotempty", "isempty", "isnull",
  "isnotnull", "iff", "iif", "coalesce", "split", "strcat", "arg_max", "arg_min",
  "make_set", "make_list", "dcount", "countif", "sum", "avg", "min", "max",
]);

const escapeHtml = (s) =>
  String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

// One pass, longest-match-first. Every branch consumes input, so this always
// terminates even on malformed KQL.
const TOKEN = new RegExp(
  [
    "(\\/\\/[^\\n]*)",                        // 1 comment
    "(@?\"(?:\\\\.|[^\"\\\\])*\"|@?'(?:\\\\.|[^'\\\\])*')", // 2 string
    "(\\b\\d+(?:\\.\\d+)?[dhms]?\\b)",        // 3 number or timespan
    "(\\|)",                                  // 4 pipe
    "([A-Za-z_][A-Za-z0-9_-]*)",              // 5 word
    "([=!<>+*/%~]+)",                         // 6 operator
  ].join("|"),
  "g",
);

export function highlightKql(kql, tables = new Set()) {
  let out = "";
  let last = 0;
  const src = String(kql);
  for (const m of src.matchAll(TOKEN)) {
    out += escapeHtml(src.slice(last, m.index));
    last = m.index + m[0].length;
    const [, comment, string, number, pipe, word, op] = m;
    if (comment) out += `<span class="k-com">${escapeHtml(comment)}</span>`;
    else if (string) out += `<span class="k-str">${escapeHtml(string)}</span>`;
    else if (number) out += `<span class="k-num">${escapeHtml(number)}</span>`;
    else if (pipe) out += `<span class="k-pipe">|</span>`;
    else if (word) {
      const cls = tables.has(word)
        ? "k-tab"
        : KEYWORDS.has(word.toLowerCase()) && word === word.toLowerCase()
          ? "k-key"
          : null;
      out += cls ? `<span class="${cls}">${escapeHtml(word)}</span>` : escapeHtml(word);
    } else out += `<span class="k-op">${escapeHtml(op)}</span>`;
  }
  return out + escapeHtml(src.slice(last));
}

// A link that opens the query in the Defender advanced hunting editor. The
// encoding is Microsoft's own: UTF-16LE bytes, gzipped, base64url, unpadded —
// confirmed against the example link published in the advanced hunting docs.
// Deliberately no runQuery: the query lands in the editor for the analyst to
// read and scope, never auto-run against their tenant.
export function huntingLink(kql) {
  const packed = gzipSync(Buffer.from(String(kql), "utf16le"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  // Microsoft caps generated links at 7,168 characters.
  if (packed.length > 6800) return null;
  return `https://security.microsoft.com/hunting?query=${packed}`;
}
