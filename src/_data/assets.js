// Cache-busting: hash style.css so its URL changes whenever the file changes.
// Browsers then always fetch the current CSS instead of a stale cached copy.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const cssPath = new URL("../css/style.css", import.meta.url);
const cssVersion = createHash("sha1").update(readFileSync(cssPath)).digest("hex").slice(0, 10);

export default { cssVersion };
