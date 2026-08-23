// Cache-busting: hash each asset so its URL changes whenever the file changes.
// Browsers then always fetch the current file instead of a stale cached copy.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const hash = (path) =>
  createHash("sha1")
    .update(readFileSync(new URL(path, import.meta.url)))
    .digest("hex")
    .slice(0, 10);

export default {
  cssVersion: hash("../css/style.css"),
  fontsVersion: hash("../css/fonts.css"),
  searchVersion: hash("../js/search.js"),
  paletteVersion: hash("../js/palette.js") + hash("../js/search.js"),
  deadlinesVersion: hash("../js/deadlines.js"),
  transitionsVersion: hash("../js/transitions.js"),
  fieldVersion: hash("../js/field.js"),
  kqlVersion: hash("../js/kql.js"),
};
