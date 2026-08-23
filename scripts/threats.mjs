// Named threats the issues have actually covered — the threat board on the home
// page and /threats/.
//
// Two deterministic signals, no guessing. Microsoft names its threat actors on a
// fixed taxonomy (Storm-#### before attribution, "<Adjective> <Weather>" after),
// which cannot collide with ordinary prose. Malware families are only taken when
// the sentence itself says what they are: "DeadLock ransomware", "a teardown of
// GigaWiper". Anything vaguer is left out — a threat board that invents entries
// is worse than a short one.
//
// Pure functions; scripts/threats.test.js runs them against the real corpus.

// The weather families Microsoft assigns by origin, plus Storm for the
// unattributed clusters. ponytail: a plain list — add a family here if Microsoft
// introduces one.
const WEATHER =
  "Blizzard|Typhoon|Sandstorm|Sleet|Rain|Dust|Cyclone|Tempest|Tsunami|Flood|Hail|Monsoon|Drizzle|Squall|Gale";

const ACTOR = new RegExp(`\\b(Storm-\\d{3,4}|[A-Z][a-z]{2,12} (?:${WEATHER}))\\b`, "g");

const KIND = "ransomware|backdoor|wiper|loader|malware|botnet|infostealer|stealer|dropper|RAT";
const FAMILY = new RegExp(`\\b([A-Z][A-Za-z0-9]{2,15})\\s+(${KIND})\\b`, "g");
// "tracked as TeamPCP" names a group; "a teardown of DeadLock" names a family or,
// sometimes, a vulnerability nickname — so the family label is only taken when
// the words just after it say what the thing is.
const NAMED_ACTOR = /(?:tracked as|tracks it as|tracks the (?:group|actor|cluster) as)\s+([A-Z][A-Za-z0-9]{2,15})\b/g;
const NAMED_THING = /(?:teardown of|dissects|dubbed|referred to as|known as)\s+([A-Z][A-Za-z0-9]{2,15})\b/g;

// Words that start a sentence or describe an implementation rather than name a
// family: "Python loader", "The malware", "Two malware families".
const NOT_A_NAME = new Set([
  "The", "This", "That", "These", "Those", "Two", "Three", "Both", "One", "Its", "Their",
  "New", "Recent", "Same", "Other", "Another", "Each", "Every", "Some", "Any", "All",
  "Python", "PowerShell", "Golang", "Rust", "Java", "JavaScript", "Node", "Delphi", "Nim",
  "Windows", "Linux", "MacOS", "Android", "Files", "File", "Multiple", "Several", "Such",
  "Microsoft", "Defender", "Sentinel", "Entra", "Azure", "Office", "Cloud", "Endpoint",
  "First", "Second", "Third", "Also", "But", "And", "For", "When", "While", "After",
  "Before", "Because", "Since", "Once", "Where", "Which", "What", "How",
]);

// Every named threat in one issue's markdown, with the words that named it.
export function parseThreats(md) {
  const body = String(md).replace(/^---[\s\S]*?\n---\n/, "");
  const found = new Map();
  const add = (name, kind, context) => {
    const hit = found.get(name) || { name, kind, mentions: 0, context };
    hit.mentions++;
    // An actor label always wins over a family guess for the same string.
    if (kind === "actor") hit.kind = "actor";
    found.set(name, hit);
  };

  for (const m of body.matchAll(ACTOR)) add(m[1], "actor", "threat actor");
  for (const m of body.matchAll(FAMILY)) {
    if (!NOT_A_NAME.has(m[1])) add(m[1], "family", m[2].toLowerCase());
  }
  for (const m of body.matchAll(NAMED_ACTOR)) {
    if (!NOT_A_NAME.has(m[1])) add(m[1], "actor", "threat actor");
  }
  for (const m of body.matchAll(NAMED_THING)) {
    if (NOT_A_NAME.has(m[1])) continue;
    // Lower-case on purpose: "the Microsoft Malware Protection Engine" is a
    // product, not a verdict that the named thing is malware.
    const after = body.slice(m.index + m[0].length, m.index + m[0].length + 120);
    const kind = after.match(new RegExp(`\\b(${KIND})\\b`));
    add(m[1], "family", kind ? kind[1] : "named threat");
  }

  // "tracked as Jasper Sleet" also matches the single word "Jasper". A name that
  // is only the first word of an actor already counted is that actor, not a
  // second threat.
  const actors = [...found.values()].filter((t) => t.kind === "actor").map((t) => t.name);
  for (const name of [...found.keys()]) {
    if (actors.some((a) => a !== name && a.startsWith(`${name} `))) found.delete(name);
  }
  return [...found.values()];
}

// One entry per threat across every issue, most recently covered first. `issues`
// is [{ ref, items }] in publication order.
export function collectThreats(issues) {
  const byName = new Map();
  for (const issue of issues) {
    for (const item of issue.items) {
      const hit = byName.get(item.name);
      if (hit) {
        if (item.kind === "actor") hit.kind = "actor";
        if (hit.context === "malware" && item.context !== "malware") hit.context = item.context;
        hit.mentions += item.mentions;
        hit.issues.push(issue.ref);
      } else {
        byName.set(item.name, { ...item, issues: [issue.ref] });
      }
    }
  }
  return [...byName.values()]
    .map((t) => ({
      ...t,
      firstSeen: t.issues[0],
      lastSeen: t.issues[t.issues.length - 1],
    }))
    .sort((a, b) =>
      String(b.lastSeen.date).localeCompare(String(a.lastSeen.date)) ||
      b.issues.length - a.issues.length ||
      a.name.localeCompare(b.name));
}
