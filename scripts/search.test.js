// Runs the exported search functions against the REAL built index, so a change
// that breaks the index shape fails here too. Needs `npm run build` first;
// skips (rather than fails) when _site is absent so the rest of `npm test`
// stays green on a clean checkout.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { search, correct, distance } from "../src/js/search.js";

const path = new URL("../_site/search-index.json", import.meta.url);
const built = existsSync(path);
const index = built ? JSON.parse(readFileSync(path, "utf8")) : { docs: [], terms: [] };
const opts = { skip: built ? false : "run `npm run build` first" };

test("matches across multiple issues", opts, () => {
  assert.ok(search("sentinel", index.docs).length > 1);
});

test("a topic hit outranks a body-only mention", opts, () => {
  const hits = search("entra id", index.docs);
  assert.ok(hits.length);
  assert.ok(hits[0].topics.some((t) => t.toLowerCase().includes("entra id")));
});

test("equal scores tie-break newest first", opts, () => {
  const hits = search("microsoft", index.docs);
  assert.ok(hits.length > 1);
  // Same-score pairs must be in descending date order.
  const byScore = {};
  for (const d of hits) (byScore[d.text.split("microsoft").length - 1] ||= []).push(d.date);
  for (const dates of Object.values(byScore)) {
    assert.deepEqual(dates, [...dates].sort().reverse());
  }
});

test("nonsense returns nothing", opts, () => {
  assert.equal(search("zzzqqwx", index.docs).length, 0);
});

test("vocabulary is built", opts, () => {
  assert.ok(index.terms.includes("sentinel"));
});

test("levenshtein counts edits", () => {
  assert.equal(distance("sentinal", "sentinel"), 1);
  assert.equal(distance("defendre", "defender"), 2);
});

test("corrects a typo to a real term", opts, () => {
  assert.equal(correct("sentinal", index.terms), "sentinel");
});

test("no correction for short or multi-word queries", () => {
  assert.equal(correct("sen", ["sentinel"]), null);
  assert.equal(correct("sentinal id", ["sentinel"]), null);
});
