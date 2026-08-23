import test from "node:test";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { highlightKql, huntingLink } from "./kql.mjs";

const decode = (url) => {
  const packed = url.split("query=")[1].replace(/-/g, "+").replace(/_/g, "/");
  return gunzipSync(Buffer.from(packed, "base64")).toString("utf16le");
};

test("a hunting link decodes back to the query it was built from", () => {
  // The encoding is Microsoft's: UTF-16LE, gzipped, base64url, unpadded.
  const q = 'DeviceProcessEvents\n| where FileName has "rundll32.exe"\n| take 10';
  assert.equal(decode(huntingLink(q)), q);
});

test("a hunting link never auto-runs against a tenant", () => {
  assert.doesNotMatch(huntingLink("DeviceEvents"), /runQuery/);
});

test("an oversized query gets no link rather than a broken one", () => {
  // Microsoft caps generated links at 7,168 characters.
  // Distinct terms, so this is genuinely large rather than merely repetitive.
  const wide = Array.from({ length: 20000 }, (_, i) => `Col${i} != "v${i}"`).join(" and ");
  assert.equal(huntingLink(`DeviceEvents\n| where ${wide}`), null);
  assert.ok(huntingLink('DeviceEvents\n| where FileName has "x"'));
});

test("highlighting marks the parts that make a query readable", () => {
  const html = highlightKql(
    '// a note\nSigninLogs\n| where ResultType == 0 and TimeGenerated > ago(7d)',
    new Set(["SigninLogs"]),
  );
  assert.match(html, /<span class="k-com">\/\/ a note<\/span>/);
  assert.match(html, /<span class="k-tab">SigninLogs<\/span>/);
  assert.match(html, /<span class="k-key">where<\/span>/);
  assert.match(html, /<span class="k-num">7d<\/span>/);
  assert.match(html, /<span class="k-pipe">\|<\/span>/);
});

test("a column that shares a keyword's spelling is not a keyword", () => {
  // "Count" the column, not "count" the aggregation.
  assert.doesNotMatch(highlightKql("T | project Count"), /k-key">Count/);
});

test("query text is escaped, never injected", () => {
  const html = highlightKql('T | where X == "<img src=x onerror=alert(1)>"');
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test("a comment swallows what looks like code inside it", () => {
  const html = highlightKql('// where Timestamp > ago(1d)\nT');
  assert.equal((html.match(/k-key/g) || []).length, 0);
});
