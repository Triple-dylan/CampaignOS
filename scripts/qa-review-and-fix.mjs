#!/usr/bin/env node
/**
 * Daily review & fix stage.
 *
 * 1. Lists open automation:qa + autofix-candidate issues (max 3).
 * 2. Re-probes the area against BASE_URL.
 * 3. If no longer reproducing: comment + close.
 * 4. If still failing and CURSOR_API_KEY is set: launch a Cloud Agent autofix run.
 * 5. Otherwise: comment with triage notes (keeps label for later agent run).
 *
 * Usage:
 *   node scripts/qa-review-and-fix.mjs
 */
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = (process.env.QA_BASE_URL || "https://campaignos-sigma.vercel.app").replace(
  /\/$/,
  "",
);
const CURSOR_API_KEY = process.env.CURSOR_API_KEY || "";
const REPO_URL =
  process.env.QA_REPO_URL ||
  `https://github.com/${process.env.GITHUB_REPOSITORY || "Triple-dylan/CampaignOS"}`;

function gh(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function listCandidates() {
  const raw = gh([
    "issue",
    "list",
    "--label",
    "autofix-candidate",
    "--label",
    "automation:qa",
    "--state",
    "open",
    "--limit",
    "20",
    "--json",
    "number,title,body,url,labels",
  ]);
  return JSON.parse(raw).filter(
    (i) => !(i.labels || []).some((l) => l.name === "needs-human"),
  );
}

function extractArea(body) {
  const m = body?.match(/## Area\n([^\n]+)/);
  return m?.[1]?.trim() || null;
}

function extractFindingId(body) {
  const m = body?.match(/Finding id: `([^`]+)`/);
  return m?.[1] || null;
}

async function stillReproduces(area) {
  if (!area || !area.startsWith("/")) return { status: "unknown", detail: "no area path" };
  const res = await fetch(`${BASE_URL}${area}`, { redirect: "manual" });
  const location = res.headers.get("location") || "";
  const redirectOk = [302, 303, 307].includes(res.status);
  const publicOk = area === "/" || area.startsWith("/sign") || area === "/api/health";

  if (publicOk) {
    const ok = res.status === 200;
    return {
      status: ok ? "resolved" : "repro",
      detail: `HTTP ${res.status}`,
      httpStatus: res.status,
    };
  }
  // Signed-out workspace expectation: redirect
  if (redirectOk && /sign-in/i.test(location)) {
    return { status: "resolved", detail: `redirect ${res.status} -> ${location}`, httpStatus: res.status };
  }
  if (redirectOk) {
    return { status: "repro", detail: `unexpected redirect ${res.status} -> ${location}`, httpStatus: res.status };
  }
  return { status: "repro", detail: `HTTP ${res.status}`, httpStatus: res.status };
}

async function launchCursorAgent(issue) {
  if (!CURSOR_API_KEY) return null;
  const prompt = [
    `You are the CampaignOS Daily Review & Fix automation for issue ${issue.url}.`,
    `Only apply a simple, high-confidence fix. Prefer doing nothing over a risky change.`,
    `Read AGENTS.md and docs/automations/prompts/03-daily-review-and-fix.md.`,
    `Validate with: pnpm lint && pnpm typecheck && ./scripts/qa-public-smoke.sh ${BASE_URL}`,
    `Open a draft PR referencing ${issue.url}. Title: fix(qa): …`,
    "",
    "Issue title: " + issue.title,
    "Issue body:",
    issue.body,
  ].join("\n");

  const res = await fetch("https://api.cursor.com/v1/agents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CURSOR_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: { text: prompt },
      repos: [{ url: REPO_URL, startingRef: "main" }],
      autoCreatePR: true,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Cursor API ${res.status}: ${text.slice(0, 400)}`);
  }
  return text;
}

async function loadPromptSnippet() {
  try {
    return await readFile(
      path.join("docs", "automations", "prompts", "03-daily-review-and-fix.md"),
      "utf8",
    );
  } catch {
    return "";
  }
}

async function main() {
  await loadPromptSnippet();
  let issues = [];
  try {
    issues = listCandidates().slice(0, 3);
  } catch (err) {
    console.error("failed to list issues:", err.stderr || err.message);
    process.exit(1);
  }

  if (issues.length === 0) {
    console.log("no autofix-candidate issues");
    return;
  }

  const results = [];
  for (const issue of issues) {
    const area = extractArea(issue.body);
    const findingId = extractFindingId(issue.body);
    const probe = await stillReproduces(area);
    if (probe.status === "resolved") {
      const comment = [
        "## Daily review",
        "",
        `Re-probed \`${area}\` against ${BASE_URL}: **no longer reproducing** (${probe.detail}).`,
        "",
        "Closing as resolved by the daily review loop.",
      ].join("\n");
      gh(["issue", "comment", String(issue.number), "--body", comment]);
      gh(["issue", "close", String(issue.number), "--reason", "completed"]);
      results.push({ issue: issue.number, decision: "closed-resolved", area, findingId });
      continue;
    }

    if (CURSOR_API_KEY) {
      try {
        const launched = await launchCursorAgent(issue);
        const comment = [
          "## Daily review",
          "",
          `Still reproducing (${probe.detail}). Launched a Cursor Cloud Agent autofix run.`,
          "",
          "```",
          (launched || "").slice(0, 1500),
          "```",
        ].join("\n");
        gh(["issue", "comment", String(issue.number), "--body", comment]);
        results.push({ issue: issue.number, decision: "launched-cursor-agent", area, findingId });
      } catch (err) {
        const comment = [
          "## Daily review",
          "",
          `Still reproducing (${probe.detail}). Failed to launch Cursor Cloud Agent:`,
          "",
          "```",
          String(err.message || err).slice(0, 800),
          "```",
        ].join("\n");
        gh(["issue", "comment", String(issue.number), "--body", comment]);
        results.push({ issue: issue.number, decision: "launch-failed", area, findingId });
      }
      continue;
    }

    const comment = [
      "## Daily review",
      "",
      `Still reproducing against ${BASE_URL}: ${probe.detail}.`,
      "",
      "No `CURSOR_API_KEY` is configured on this repository, so an AI autofix agent was not launched.",
      "Leaving `autofix-candidate` in place for the next agent-capable run.",
      "",
      findingId ? `Finding id: \`${findingId}\`` : "",
    ]
      .filter(Boolean)
      .join("\n");
    gh(["issue", "comment", String(issue.number), "--body", comment]);
    results.push({ issue: issue.number, decision: "commented-needs-agent", area, findingId });
  }

  console.log(JSON.stringify({ baseUrl: BASE_URL, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
