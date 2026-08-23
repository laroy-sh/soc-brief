import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseThreats, collectThreats } from "./threats.mjs";

const BRIEFS = path.join(import.meta.dirname, "..", "src", "briefs");

const corpus = () =>
  fs.readdirSync(BRIEFS)
    .filter((f) => f.endsWith("-week.md"))
    .sort()
    .map((f) => ({
      ref: { date: f.slice(0, 10), url: `/briefs/${f.slice(0, 10)}/`, week: 0 },
      items: parseThreats(fs.readFileSync(path.join(BRIEFS, f), "utf8")),
    }));

const find = (list, name) => list.find((t) => t.name === name);

test("Microsoft actor names are taken from their own taxonomy", () => {
  const t = parseThreats("Microsoft attributes the campaign to Midnight Blizzard, and a second cluster to Storm-2945.");
  assert.deepEqual(t.map((x) => x.name).sort(), ["Midnight Blizzard", "Storm-2945"]);
  assert.ok(t.every((x) => x.kind === "actor"));
});

test("a family is taken only when the sentence says what it is", () => {
  const t = parseThreats(
    "Microsoft published a teardown of DeadLock, a Rust-based ransomware family. It also dissects GigaWiper, a destructive backdoor built from a wiper.",
  );
  assert.equal(find(t, "DeadLock").context, "ransomware");
  assert.equal(find(t, "GigaWiper").context, "backdoor");
});

test("a vulnerability nickname is not called malware", () => {
  // The sentence contains "Malware Protection Engine" — a product, not a verdict.
  const [t] = parseThreats(
    "An elevation of privilege that Microsoft acknowledges is publicly referred to as ShieldBreak. Microsoft says it is working on an update.",
  );
  assert.equal(t.name, "ShieldBreak");
  assert.equal(t.context, "named threat");
});

test("an implementation language is not a family name", () => {
  const names = parseThreats("The malware is a Python loader paired with a Golang backdoor. Two malware families were seen.")
    .map((t) => t.name);
  assert.deepEqual(names, []);
});

test("the first word of an actor name is not a second threat", () => {
  const t = parseThreats("Microsoft tracks the group as Jasper Sleet, a North Korean cluster.");
  assert.deepEqual(t.map((x) => x.name), ["Jasper Sleet"]);
});

test("the corpus yields real threats and no obvious junk", () => {
  const all = collectThreats(corpus());
  assert.ok(all.length >= 12);
  assert.ok(find(all, "DeadLock"));
  assert.ok(find(all, "Sapphire Sleet").kind === "actor");
  assert.ok(find(all, "TeamPCP").kind === "actor");
  assert.equal(find(all, "Jasper"), undefined);
  // Every name is a name: capitalised, no stray sentence openers.
  assert.ok(all.every((t) => /^[A-Z]/.test(t.name)));
});

test("threats are ordered by the most recent issue that covered them", () => {
  const dates = collectThreats(corpus()).map((t) => t.lastSeen.date);
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test("an issue that names nothing yields nothing", () => {
  assert.deepEqual(parseThreats("Sentinel shipped a new connector this week. Nothing else changed."), []);
});
