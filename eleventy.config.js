// Eleventy v3 config (ESM). Ported from the awssec project; same week helpers
// and calendar collection so the two sites share one convention.

import fs from "node:fs";
import { feedPlugin } from "@11ty/eleventy-plugin-rss";

// --- Week helpers ---
function firstMondayOfYear(year) {
  const d = new Date(Date.UTC(year, 0, 1));
  const day = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCDate(d.getUTCDate() + ((7 - day) % 7));
  return d;
}
function calendarWeeksInYear(year) {
  const first = firstMondayOfYear(year);
  const last = new Date(Date.UTC(year, 11, 31));
  return Math.floor((last - first) / 6048e5) + 1; // 6048e5 ms = 1 week
}
function briefWeekParts(input) {
  const year = input.getUTCFullYear();
  const d = new Date(Date.UTC(year, input.getUTCMonth(), input.getUTCDate()));
  const first = firstMondayOfYear(year);
  const week = Math.max(1, Math.floor((d - first) / 6048e5) + 1);
  return { year, week };
}

// Known Log Analytics / advanced hunting table names, harvested from the
// kqlsearch corpus. ponytail: a plain allow-list beats guessing — add a name
// here if a future query uses a table the tag cloud misses.
const KQL_TABLES = new Set([
  "AzureDiagnostics", "AADManagedIdentitySignInLogs", "AADNonInteractiveUserSignInLogs", "AADProvisioningLogs",
  "AADRiskyUsers", "AADServicePrincipalSignInLogs", "AADSignInEventsBeta", "AADUserRiskEvents",
  "ADFSSignInLogs", "ADOAuditLogs_CL", "AIAgentsInfo", "ASimDnsActivityLogs", "AgentsInfo",
  "AlertEvidence", "AppDependencies", "AppEvents", "AuditLogs", "AzureActivity",
  "AzureDevOpsAuditing", "BehaviorAnalytics", "BehaviorEntities", "CloudAppEvents",
  "CommonSecurityLog", "CopilotActivity", "CopilotAdminActivity", "DataSecurityBehaviors",
  "DataSecurityEvents", "DeviceEvents", "DeviceFileCertificateInfo", "DeviceFileEvents",
  "DeviceImageLoadEvents", "DeviceInfo", "DeviceLogonEvents", "DeviceNetworkEvents",
  "DeviceNetworkInfo", "DeviceProcessEvents", "DeviceRegistryEvents",
  "DeviceTvmBrowserExtensions", "DeviceTvmInfoGathering",
  "DeviceTvmSecureConfigurationAssessment", "DeviceTvmSecureConfigurationAssessmentKB",
  "DeviceTvmSoftwareInventory", "DeviceTvmSoftwareVulnerabilities",
  "DeviceTvmSoftwareVulnerabilitiesKB", "EasmRisk_CL", "EasyVista_Assets_CL",
  "EasyVista_Tickets_CL", "EmailAttachmentInfo", "EmailEvents", "EmailPostDeliveryEvents",
  "EmailUrlInfo", "EntraIdSignInEvents", "Event", "ExposureGraphEdges", "ExposureGraphNodes",
  "FileMaliciousContentInfo", "GWSAlerts_CL", "GraphAPIAuditEvents", "Heartbeat",
  "IdentityDirectoryEvents", "IdentityInfo", "IdentityLogonEvents", "IdentityQueryEvents",
  "IntuneAuditLogs", "IntuneDeviceComplianceOrg", "IntuneDevices", "IntuneOperationalLogs",
  "KnowExploitesVulnsCISA", "MessageEvents", "MessageUrlInfo", "MicrosoftGraphActivityLogs",
  "MicrosoftPurviewInformationProtection", "NetskopeEvents_CL", "NetskopeWebTx_CL",
  "NetworkAccessTraffic", "OAuthAppInfo", "OfficeActivity", "OpenAIAuditLogs",
  "OpenAIChatCompletions", "Operation", "Resources", "RiskyServicePrincipals", "SecurityAlert",
  "SecurityEvent", "SecurityIncident", "SentinelHealth", "ServicePrincipalRiskEvents",
  "SigninLogs", "StorageBlobLogs", "Syslog", "ThreatIntelIndicators",
  "ThreatIntelligenceIndicator", "UrlClickEvents", "Usage", "WindowsEvent", "_GetWatchlist",
]);

// Data tables a query reads: identifiers that head a pipeline, kept only when
// they are a known table (drops column names and let-variables).
function kqlTables(kql) {
  const out = new Set();
  const lines = kql.split("\n").map((l) => l.replace(/\/\/.*$/, "").trim());
  lines.forEach((line, i) => {
    const head = line
      .replace(/^let\s+[\w.]+\s*=\s*/, "")
      .replace(/^(materialize|toscalar)\s*\(\s*/, "")
      .replace(/^\(\s*/, "")
      .replace(/^union\s+(?:isfuzzy=\w+\s*)?/, "")
      .replace(/^join\s+(?:kind\s*=\s*\w+\s*)?\(?\s*/, "");
    for (const part of head.split(",")) {
      const m = part.trim().match(/^([A-Za-z_][A-Za-z0-9_]{3,})\s*(\|)?$/);
      if (m && KQL_TABLES.has(m[1])) out.add(m[1]);
    }
  });
  return [...out].sort();
}

export default function (eleventyConfig) {
  // Copy static assets straight through to the build output.
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/js");
  // Cloudflare Pages security headers must land at the output root.
  eleventyConfig.addPassthroughCopy("src/_headers");

  // Rebuild when CSS changes during `eleventy --serve`.
  eleventyConfig.addWatchTarget("src/css");
  eleventyConfig.addWatchTarget("src/js");

  // Atom feed at /feed.xml, built from the `brief` collection with the full
  // issue body (links made absolute).
  eleventyConfig.addPlugin(feedPlugin, {
    type: "atom",
    outputPath: "/feed.xml",
    collection: { name: "brief", limit: 0 }, // 0 = every issue
    metadata: {
      language: "en",
      title: "SOC Weekly Brief",
      subtitle: "The week in the Microsoft security stack, distilled",
      base: "https://soc-brief.pages.dev/",
      author: { name: "Laroy Shtotland" },
    },
  });

  // Small date helpers (no extra dependencies). Dates are treated as UTC so a
  // front-matter date like `2026-06-23` never drifts to the day before.
  const fmt = (opts) => (value) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(value);
  eleventyConfig.addFilter("readableDate", fmt({ year: "numeric", month: "long", day: "numeric" }));
  eleventyConfig.addFilter("shortDate", fmt({ year: "numeric", month: "short", day: "numeric" }));
  eleventyConfig.addFilter("isoDate", (value) => new Date(value).toISOString().slice(0, 10));
  eleventyConfig.addFilter("isoWeek", (value) => briefWeekParts(new Date(value)).week);
  eleventyConfig.addFilter("pad2", (n) => String(n).padStart(2, "0"));
  // Topic → URL slug. "Defender XDR" → "defender-xdr", "MS365" → "ms365".
  eleventyConfig.addFilter("topicSlug", (s) =>
    String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  eleventyConfig.addFilter("adjacentBrief", (url, briefs, direction) => {
    const idx = briefs.findIndex((b) => b.url === url);
    if (idx === -1) return null;
    return briefs[idx + direction] || null;
  });
  eleventyConfig.addFilter("navRange", (title) => {
    const parts = String(title).split("–").map((s) => s.trim());
    if (parts.length !== 2) return title;
    const shortMonths = {
      January: "Jan",
      February: "Feb",
      March: "Mar",
      April: "Apr",
      May: "May",
      June: "Jun",
      July: "Jul",
      August: "Aug",
      September: "Sep",
      October: "Oct",
      November: "Nov",
      December: "Dec",
    };
    const start = parts[0].match(/^([A-Za-z]+)\s+(\d+)/);
    const end = parts[1].match(/^(?:([A-Za-z]+)\s+)?(\d+)/);
    if (!start || !end) return title;
    const startMonth = shortMonths[start[1]] || start[1];
    const endMonth = shortMonths[end[1]] || end[1] || startMonth;
    const startDay = start[2];
    const endDay = end[2];
    return startMonth === endMonth
      ? `${startMonth} ${startDay}-${endDay}`
      : `${startMonth} ${startDay}-${endMonth} ${endDay}`;
  });
  // Estimated reading time in whole minutes (200 wpm), from rendered HTML.
  eleventyConfig.addFilter("readingTime", (html) => {
    const words = (String(html).replace(/<[^>]+>/g, " ").match(/\S+/g) || []).length;
    return Math.max(1, Math.round(words / 200));
  });

  // Unique topics across all issues, with the issues carrying each — drives the
  // tag cloud and the per-topic pages. Sorted by frequency, then name.
  eleventyConfig.addCollection("topicsList", (api) => {
    const briefs = api.getFilteredByTag("brief");
    const map = {};
    for (const b of briefs) {
      for (const t of b.data.topics || []) {
        (map[t] ||= []).push(b);
      }
    }
    return Object.entries(map)
      .map(([name, items]) => ({ name, count: items.length, items }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  // Every "## KQL to try" entry across all issues, newest first — drives /kql/.
  // Parses the raw markdown, so a new brief pushed by the weekly routine shows
  // up here on the next build with no extra step. Deliberately tolerant: any
  // paragraph ending in a link, followed by a kql fence, counts as an entry.
  const kqlCollection = (api) => {
    const entry = /^(\S.*)\n+```kql\n([\s\S]*?)\n```/gm;
    const link = /\[([^\]]+)\]\((https?:\S+?)\)\)?\s*$/;
    const out = [];
    for (const b of api.getFilteredByTag("brief")) {
      const md = fs.readFileSync(b.inputPath, "utf8");
      const section = md.split("## KQL to try")[1];
      if (!section) continue;
      const body = section.split(/^## /m)[0];
      let found = 0;
      for (const m of body.matchAll(entry)) {
        const line = m[1];
        const l = line.match(link);
        if (!l) continue;
        const label = l[1];
        const cut = label.lastIndexOf(" — ");
        out.push({
          note: line.replace(link, "").replace(/\s*\($/, "").trim() || label,
          title: cut === -1 ? label : label.slice(0, cut),
          author: cut === -1 ? "" : label.slice(cut + 3),
          source: l[2],
          kql: m[2],
          tables: kqlTables(m[2]),
          issue: { url: b.url, title: b.data.title, date: b.date },
        });
        found++;
      }
      const fences = (body.match(/```kql/g) || []).length;
      if (found !== fences) {
        console.warn(`[kql] ${b.inputPath}: parsed ${found} of ${fences} queries — check the entry format`);
      }
    }
    return out.sort((a, b) => new Date(b.issue.date) - new Date(a.issue.date));
  };
  eleventyConfig.addCollection("kqlQueries", kqlCollection);

  // Tables used across the KQL library, most-used first — the /kql/ tag cloud.
  eleventyConfig.addCollection("kqlTablesList", (api) => {
    const counts = {};
    for (const q of api.getFilteredByTag("brief").length ? kqlCollection(api) : []) {
      for (const t of q.tables) counts[t] = (counts[t] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  });

  // Build a per-year calendar: every Monday issue week in the calendar year,
  // flagged if a brief was published. The first Monday-dated brief in January is
  // week 1, and late-December briefs stay in that calendar year.
  eleventyConfig.addCollection("calendars", (api) => {
    const briefs = api.getFilteredByTag("brief");
    const byKey = {};
    const years = new Set();
    const weeksByYear = {};
    const firstWeekByYear = {};
    for (const b of briefs) {
      const { year, week } = briefWeekParts(new Date(b.date));
      years.add(year);
      weeksByYear[year] = Math.max(weeksByYear[year] || 0, week);
      firstWeekByYear[year] = Math.min(firstWeekByYear[year] || week, week);
      byKey[`${year}-${week}`] = { url: b.url, title: b.data.title, topics: b.data.topics || [] };
    }
    const cur = briefWeekParts(new Date());
    return [...years]
      .sort((a, b) => b - a)
      .map((year) => {
        const total = Math.max(calendarWeeksInYear(year), weeksByYear[year] || 0);
        const first = year < cur.year ? firstWeekByYear[year] || 1 : 1;
        const weeks = [];
        for (let w = first; w <= total; w++) {
          const hit = byKey[`${year}-${w}`];
          weeks.push({
            week: w,
            year,
            hasBrief: !!hit,
            url: hit && hit.url,
            title: hit && hit.title,
            topics: (hit && hit.topics) || [],
            isCurrent: year === cur.year && w === cur.week,
            isFuture: year > cur.year || (year === cur.year && w > cur.week),
          });
        }
        return { year, weeks };
      });
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    // Layouts/templates use Nunjucks. Markdown bodies are NOT run through a
    // template engine, so KQL snippets containing braces are safe to paste.
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
}
