import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { parseActBy, parseDeadlineDate, collapseDeadlines, deadlineStatus } from "./actby.mjs";

const BRIEFS = path.join(import.meta.dirname, "..", "src", "briefs");

const corpus = () =>
  fs.readdirSync(BRIEFS)
    .filter((f) => f.endsWith("-week.md"))
    .sort()
    .map((f) => ({
      date: f.slice(0, 10),
      ref: { date: f.slice(0, 10), url: `/briefs/${f.slice(0, 10)}/` },
      items: parseActBy(fs.readFileSync(path.join(BRIEFS, f), "utf8")),
    }));

test("a full date parses, a month or a season does not", () => {
  assert.equal(parseDeadlineDate("25 Aug 2026").iso, "2026-08-25");
  assert.equal(parseDeadlineDate("1 Jul 2026").iso, "2026-07-01");
  assert.equal(parseDeadlineDate("31 Jun 2026").iso, null); // no such day
  assert.equal(parseDeadlineDate("Jun 2026").iso, null);
  assert.equal(parseDeadlineDate("Summer 2026").iso, null);
  assert.equal(parseDeadlineDate("Summer 2026").label, "Summer 2026");
});

test("a bullet yields the date, the prose and the citation", () => {
  const [item] = parseActBy(
    "## Act by\n\n- **14 Sep 2026** — the agent is disabled. Migrate first. ([Azure updates](https://azure.microsoft.com/en-us/updates?id=568457))\n\n## What changed\n",
  );
  assert.equal(item.iso, "2026-09-14");
  assert.equal(item.text, "the agent is disabled. Migrate first.");
  assert.equal(item.source, "https://azure.microsoft.com/en-us/updates?id=568457");
  assert.equal(item.sourceLabel, "Azure updates");
});

test("an issue with no Act by section yields nothing", () => {
  assert.deepEqual(parseActBy("## What changed\n\nSomething shipped.\n"), []);
});

test("the 1 Jul 2026 deadline collapses to its three real obligations", () => {
  // The corpus repeats this date across fourteen bullets in ten issues; it is
  // three distinct obligations. If this count drifts the dedup heuristic broke.
  const july = collapseDeadlines(corpus()).filter((d) => d.iso === "2026-07-01");
  assert.equal(july.length, 3);
  assert.ok(july.some((d) => /AIAgentsInfo/.test(d.text)));
  assert.ok(july.some((d) => /Account Name/.test(d.text)));
  assert.ok(july.some((d) => /RBAC/.test(d.text)));
});

test("collapsing keeps the newest wording and every issue that raised it", () => {
  const account = collapseDeadlines(corpus())
    .filter((d) => d.iso === "2026-07-01")
    .find((d) => /Account Name/.test(d.text));
  assert.ok(account.issues.length > 1);
  assert.equal(account.lastSeen.date, account.issues[account.issues.length - 1].date);
  assert.ok(account.firstSeen.date < account.lastSeen.date);
});

test("dated obligations sort ahead of undated ones", () => {
  const all = collapseDeadlines(corpus());
  const firstUndated = all.findIndex((d) => !d.iso);
  assert.ok(firstUndated > 0);
  assert.ok(all.slice(firstUndated).every((d) => !d.iso));
});

test("status is measured against today, and today is still due", () => {
  assert.equal(deadlineStatus("2026-08-25", "2026-08-23"), "due");
  assert.equal(deadlineStatus("2026-08-23", "2026-08-23"), "due");
  assert.equal(deadlineStatus("2026-08-22", "2026-08-23"), "overdue");
  assert.equal(deadlineStatus("2027-03-31", "2026-08-23"), "ahead");
  assert.equal(deadlineStatus(null, "2026-08-23"), "undated");
});
