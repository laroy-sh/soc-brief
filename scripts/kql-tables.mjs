// Known Log Analytics and advanced hunting table names, harvested from the
// kqlsearch corpus, each mapped to where its schema is documented:
//
//   "defender" → learn.microsoft.com/defender-xdr/advanced-hunting-<name>-table
//   "monitor"  → learn.microsoft.com/azure/azure-monitor/reference/tables/<name>
//   null       → not checked, or a custom table with no first-party page
//
// The families were verified one page at a time against Learn; the nulls are the
// ones that sweep could not confirm before Learn started rate limiting, so they
// fall back to a Learn search, which cannot 404. Promote a null to its family
// once you have confirmed the page exists.
//
// ponytail: a plain list beats guessing — add a name here if a future query uses
// a table the tag cloud misses.
export const KQL_TABLE_DOCS = new Map([
  ["AADManagedIdentitySignInLogs", "monitor"],
  ["AADNonInteractiveUserSignInLogs", "monitor"],
  ["AADProvisioningLogs", "monitor"],
  ["AADRiskyUsers", "monitor"],
  ["AADServicePrincipalSignInLogs", "monitor"],
  ["AADSignInEventsBeta", "defender"],
  ["AADUserRiskEvents", "monitor"],
  ["ADFSSignInLogs", "monitor"],
  ["ADOAuditLogs_CL", null],
  ["AIAgentsInfo", "defender"],
  ["ASimDnsActivityLogs", "monitor"],
  ["AgentsInfo", "defender"],
  ["AlertEvidence", "defender"],
  ["AppDependencies", "monitor"],
  ["AppEvents", "monitor"],
  ["AuditLogs", "monitor"],
  ["AzureActivity", "monitor"],
  ["AzureDevOpsAuditing", "monitor"],
  ["AzureDiagnostics", "monitor"],
  ["BehaviorAnalytics", "monitor"],
  ["BehaviorEntities", "defender"],
  ["CloudAppEvents", "defender"],
  ["CommonSecurityLog", "monitor"],
  ["CopilotActivity", "monitor"],
  ["CopilotAdminActivity", null],
  ["DataSecurityBehaviors", "defender"],
  ["DataSecurityEvents", "defender"],
  ["DeviceEvents", "defender"],
  ["DeviceFileCertificateInfo", "defender"],
  ["DeviceFileEvents", "defender"],
  ["DeviceImageLoadEvents", "defender"],
  ["DeviceInfo", "defender"],
  ["DeviceLogonEvents", "defender"],
  ["DeviceNetworkEvents", "defender"],
  ["DeviceNetworkInfo", "defender"],
  ["DeviceProcessEvents", "defender"],
  ["DeviceRegistryEvents", "defender"],
  ["DeviceTvmBrowserExtensions", "defender"],
  ["DeviceTvmInfoGathering", "defender"],
  ["DeviceTvmSecureConfigurationAssessment", "defender"],
  ["DeviceTvmSecureConfigurationAssessmentKB", "defender"],
  ["DeviceTvmSoftwareInventory", "defender"],
  ["DeviceTvmSoftwareVulnerabilities", "defender"],
  ["DeviceTvmSoftwareVulnerabilitiesKB", "defender"],
  ["EasmRisk_CL", null],
  ["EasyVista_Assets_CL", null],
  ["EasyVista_Tickets_CL", null],
  ["EmailAttachmentInfo", "defender"],
  ["EmailEvents", "defender"],
  ["EmailPostDeliveryEvents", "defender"],
  ["EmailUrlInfo", "defender"],
  ["EntraIdSignInEvents", "defender"],
  ["Event", "monitor"],
  ["ExposureGraphEdges", "defender"],
  ["ExposureGraphNodes", "defender"],
  ["FileMaliciousContentInfo", "defender"],
  ["GWSAlerts_CL", null],
  ["GraphAPIAuditEvents", "defender"],
  ["Heartbeat", "monitor"],
  ["IdentityDirectoryEvents", null],
  ["IdentityInfo", null],
  ["IdentityLogonEvents", null],
  ["IdentityQueryEvents", null],
  ["IntuneAuditLogs", null],
  ["IntuneDeviceComplianceOrg", null],
  ["IntuneDevices", null],
  ["IntuneOperationalLogs", null],
  ["KnowExploitesVulnsCISA", null],
  ["MessageEvents", null],
  ["MessageUrlInfo", null],
  ["MicrosoftGraphActivityLogs", null],
  ["MicrosoftPurviewInformationProtection", null],
  ["NetskopeEvents_CL", null],
  ["NetskopeWebTx_CL", null],
  ["NetworkAccessTraffic", null],
  ["OAuthAppInfo", null],
  ["OfficeActivity", null],
  ["OpenAIAuditLogs", null],
  ["OpenAIChatCompletions", null],
  ["Operation", null],
  ["Resources", null],
  ["RiskyServicePrincipals", null],
  ["SecurityAlert", null],
  ["SecurityEvent", null],
  ["SecurityIncident", null],
  ["SentinelHealth", null],
  ["ServicePrincipalRiskEvents", null],
  ["SigninLogs", null],
  ["StorageBlobLogs", null],
  ["Syslog", null],
  ["ThreatIntelIndicators", null],
  ["ThreatIntelligenceIndicator", null],
  ["UrlClickEvents", null],
  ["Usage", null],
  ["WindowsEvent", null],
  ["_GetWatchlist", null],]);

export const KQL_TABLES = new Set(KQL_TABLE_DOCS.keys());

// Where to send a reader who clicks a table name. A custom `_CL` table is the
// customer's own, so it gets no link at all.
export function tableDocUrl(name) {
  if (/_CL$/.test(name) || name.startsWith("_")) return null;
  const family = KQL_TABLE_DOCS.get(name);
  const slug = name.toLowerCase();
  if (family === "defender") return `https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-${slug}-table`;
  if (family === "monitor") return `https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/${slug}`;
  return `https://learn.microsoft.com/en-us/search/?terms=${encodeURIComponent(name)}`;
}
