#!/usr/bin/env node
/**
 * Daily smoke stage: exercise production public surfaces in loops,
 * write qa/daily/YYYY-MM-DD/{findings.json,smoke-report.md}.
 *
 * Usage:
 *   node scripts/qa-smoke-report.mjs [BASE_URL] [--loops=3]
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = (process.argv[2] || "https://campaignos-sigma.vercel.app").replace(
  /\/$/,
  "",
);
const loopsArg = process.argv.find((a) => a.startsWith("--loops="));
const LOOPS = Math.max(1, Number(loopsArg?.split("=")[1] || 3));

const PUBLIC_OK = [
  { id: "home", path: "/", expect: [200] },
  { id: "sign-in", path: "/sign-in", expect: [200] },
  { id: "sign-up", path: "/sign-up", expect: [200] },
  { id: "health", path: "/api/health", expect: [200] },
];

const REDIRECT_PATHS = [
  "/dashboard",
  "/brain",
  "/planner",
  "/assets",
  "/research",
  "/fundraising",
  "/tasks",
  "/compliance",
  "/automations",
  "/settings",
  "/onboarding",
];

const date = new Date().toISOString().slice(0, 10);
const outDir = path.join("qa", "daily", date);

async function probe(pathname) {
  const res = await fetch(`${BASE_URL}${pathname}`, { redirect: "manual" });
  const body = await res.text().catch(() => "");
  return { status: res.status, body, location: res.headers.get("location") || "" };
}

function severityForStatus(status, expectRedirect) {
  if (status >= 500) return "critical";
  if (expectRedirect && status === 404) return "high";
  if (!expectRedirect && status >= 400) return "high";
  return "medium";
}

async function runLoop(loopIndex, checks, findings) {
  for (const item of PUBLIC_OK) {
    const result = await probe(item.path);
    const ok = item.expect.includes(result.status);
    const checkId = `loop${loopIndex}-${item.id}`;
    checks.push({
      id: checkId,
      status: ok ? "pass" : "fail",
      detail: `HTTP ${result.status}`,
      httpStatus: result.status,
    });
    if (!ok) {
      findings.push({
        id: `smoke-${item.id}-${result.status}`,
        title: `Public route ${item.path} returned ${result.status}`,
        severity: severityForStatus(result.status, false),
        area: item.path,
        repro: `GET ${BASE_URL}${item.path} (no auth)`,
        expected: `HTTP ${item.expect.join(" or ")}`,
        actual: `HTTP ${result.status}`,
        autofixCandidate: result.status === 404 || result.status >= 500,
        evidence: [`loop=${loopIndex}`, result.body.slice(0, 200)],
      });
    }
    if (item.id === "health" && ok) {
      try {
        const json = JSON.parse(result.body);
        if (json.status !== "ok") {
          checks.push({
            id: `${checkId}-payload`,
            status: "fail",
            detail: "health status not ok",
          });
          findings.push({
            id: "smoke-health-payload",
            title: "Health endpoint payload missing status ok",
            severity: "high",
            area: "/api/health",
            repro: `GET ${BASE_URL}/api/health`,
            expected: '{"status":"ok",...}',
            actual: result.body.slice(0, 300),
            autofixCandidate: true,
            evidence: [`loop=${loopIndex}`],
          });
        }
      } catch {
        findings.push({
          id: "smoke-health-json",
          title: "Health endpoint returned non-JSON",
          severity: "high",
          area: "/api/health",
          repro: `GET ${BASE_URL}/api/health`,
          expected: "JSON body",
          actual: result.body.slice(0, 300),
          autofixCandidate: true,
          evidence: [`loop=${loopIndex}`],
        });
      }
    }
  }

  for (const p of REDIRECT_PATHS) {
    const result = await probe(p);
    const ok = [302, 303, 307].includes(result.status);
    const checkId = `loop${loopIndex}-redir-${p.replace(/\W+/g, "")}`;
    checks.push({
      id: checkId,
      status: ok ? "pass" : "fail",
      detail: `HTTP ${result.status} loc=${result.location}`,
      httpStatus: result.status,
    });
    if (!ok) {
      findings.push({
        id: `smoke-redir-${p.replace(/\W+/g, "-")}-${result.status}`,
        title: `Signed-out ${p} did not redirect to sign-in`,
        severity: severityForStatus(result.status, true),
        area: p,
        repro: `GET ${BASE_URL}${p} while signed out`,
        expected: "302/303/307 toward /sign-in",
        actual: `HTTP ${result.status} location=${result.location || "(none)"}`,
        autofixCandidate: result.status === 404 || result.status >= 500,
        evidence: [`loop=${loopIndex}`],
      });
    }
  }
}

function dedupeFindings(findings) {
  const map = new Map();
  for (const f of findings) {
    if (!map.has(f.id)) map.set(f.id, f);
  }
  return [...map.values()];
}

async function main() {
  const checks = [];
  const rawFindings = [];
  for (let i = 1; i <= LOOPS; i++) {
    await runLoop(i, checks, rawFindings);
  }
  const findings = dedupeFindings(rawFindings);
  const failed = checks.filter((c) => c.status === "fail").length;
  const summary =
    failed === 0
      ? `All public checks passed across ${LOOPS} loops (${checks.length} checks).`
      : `${failed}/${checks.length} checks failed across ${LOOPS} loops; ${findings.length} unique findings.`;

  const report = {
    date,
    baseUrl: BASE_URL,
    agentRunUrl: process.env.GITHUB_SERVER_URL
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : "",
    loopsCompleted: LOOPS,
    summary,
    checks,
    findings,
  };

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "findings.json"), JSON.stringify(report, null, 2) + "\n");

  const md = [
    `# Smoke report — ${date}`,
    "",
    `- **Base URL:** ${BASE_URL}`,
    `- **Loops completed:** ${LOOPS}`,
    `- **Agent run:** ${report.agentRunUrl || "(local)"}`,
    "",
    "## Summary",
    "",
    summary,
    "",
    "## Checks",
    "",
    "| ID | Status | Detail |",
    "| -- | ------ | ------ |",
    ...checks.map((c) => `| ${c.id} | ${c.status} | ${c.detail || ""} |`),
    "",
    "## Findings",
    "",
  ];
  if (findings.length === 0) {
    md.push("_No findings._", "");
  } else {
    for (const f of findings) {
      md.push(
        `### Finding: ${f.title}`,
        "",
        `- **ID:** ${f.id}`,
        `- **Severity:** ${f.severity}`,
        `- **Area:** ${f.area}`,
        `- **Autofix candidate:** ${f.autofixCandidate ? "yes" : "no"}`,
        `- **Repro:** ${f.repro}`,
        `- **Expected:** ${f.expected}`,
        `- **Actual:** ${f.actual}`,
        `- **Evidence:** ${(f.evidence || []).join("; ")}`,
        "",
      );
    }
  }
  await writeFile(path.join(outDir, "smoke-report.md"), md.join("\n"));
  console.log(summary);
  console.log(`Wrote ${outDir}/findings.json and smoke-report.md`);
  if (findings.length > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
