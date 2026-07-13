#!/usr/bin/env node
/**
 * Daily issue logger: turn qa/daily/<date>/findings.json into deduped GitHub Issues.
 *
 * Usage:
 *   node scripts/qa-log-issues.mjs [path-to-findings.json]
 *
 * Requires: gh CLI authenticated with issues:write.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

function gh(args, opts = {}) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  }).trim();
}

function ensureLabels() {
  const labels = [
    ["automation:qa", "0E8A16", "QA automation loop"],
    ["severity:critical", "B60205", "Critical QA finding"],
    ["severity:high", "D93F0B", "High severity QA finding"],
    ["severity:medium", "FBCA04", "Medium severity QA finding"],
    ["severity:low", "C5DEF5", "Low severity QA finding"],
    ["autofix-candidate", "5319E7", "Safe for daily autofix automation"],
    ["needs-human", "E99695", "Requires human judgment"],
  ];
  for (const [name, color, description] of labels) {
    try {
      gh(["label", "create", name, "--color", color, "--description", description, "--force"]);
    } catch {
      // ignore — label may already exist without --force support
    }
  }
}

async function newestFindingsPath(explicit) {
  if (explicit) return explicit;
  const root = path.join("qa", "daily");
  let entries = [];
  try {
    entries = await readdir(root);
  } catch {
    return null;
  }
  const dirs = [];
  for (const name of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) continue;
    const full = path.join(root, name, "findings.json");
    try {
      const s = await stat(full);
      dirs.push({ full, mtime: s.mtimeMs, name });
    } catch {
      /* skip */
    }
  }
  dirs.sort((a, b) => b.name.localeCompare(a.name));
  return dirs[0]?.full || null;
}

function openQaIssues() {
  try {
    const raw = gh([
      "issue",
      "list",
      "--label",
      "automation:qa",
      "--state",
      "open",
      "--limit",
      "100",
      "--json",
      "number,title,body,labels,url",
    ]);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function isDuplicate(existing, finding) {
  const needle = `${finding.area}`.toLowerCase();
  const titleNeedle = finding.title.toLowerCase().slice(0, 48);
  return existing.some((issue) => {
    const hay = `${issue.title}\n${issue.body || ""}`.toLowerCase();
    return (
      hay.includes(`finding id: \`${finding.id}\``.toLowerCase()) ||
      hay.includes(`finding id: ${finding.id}`.toLowerCase()) ||
      (hay.includes(needle) && issue.title.toLowerCase().includes(titleNeedle.slice(0, 24)))
    );
  });
}

function issueBody(report, finding) {
  return [
    "## Summary",
    finding.title,
    "",
    "## Severity",
    finding.severity,
    "",
    "## Area",
    finding.area,
    "",
    "## Repro",
    finding.repro,
    "",
    "## Expected",
    finding.expected,
    "",
    "## Actual",
    finding.actual,
    "",
    "## Evidence",
    ...(finding.evidence || []).map((e) => `- ${e}`),
    "",
    "## Source",
    `- Smoke date: ${report.date}`,
    `- Finding id: \`${finding.id}\``,
    `- Report path: \`qa/daily/${report.date}/findings.json\``,
    `- Autofix candidate (from smoke): ${finding.autofixCandidate}`,
    `- Base URL: ${report.baseUrl}`,
    report.agentRunUrl ? `- Smoke run: ${report.agentRunUrl}` : "",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  ensureLabels();
  const findingsPath = await newestFindingsPath(process.argv[2]);
  if (!findingsPath) {
    console.log("no smoke report found");
    return;
  }
  const report = JSON.parse(await readFile(findingsPath, "utf8"));
  const existing = openQaIssues();
  const created = [];
  const skipped = [];

  for (const finding of report.findings || []) {
    if (isDuplicate(existing, finding)) {
      skipped.push(finding.id);
      continue;
    }
    const labels = ["automation:qa", `severity:${finding.severity}`];
    if (finding.autofixCandidate) labels.push("autofix-candidate");
    else labels.push("needs-human");

    const args = [
      "issue",
      "create",
      "--title",
      `[QA] ${finding.severity} — ${finding.title}`,
      "--body",
      issueBody(report, finding),
    ];
    for (const label of labels) {
      args.push("--label", label);
    }
    try {
      const url = gh(args);
      created.push({ id: finding.id, url });
      console.log(`created ${finding.id} -> ${url}`);
    } catch (err) {
      console.error(`failed to create issue for ${finding.id}:`, err.stderr || err.message);
    }
  }

  console.log(
    JSON.stringify(
      {
        report: findingsPath,
        findings: (report.findings || []).length,
        created: created.length,
        skippedDupes: skipped.length,
        createdUrls: created,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
