#!/usr/bin/env node
import fs from "node:fs";
import process from "node:process";
import { pathToFileURL } from "node:url";

const SHA_RE = /^[0-9a-f]{40}$/i;
const DEFAULT_ATTEMPTS = 24;
const DEFAULT_INTERVAL_MS = 5_000;

function required(value, name) {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function exactSha(value, name) {
  if (!SHA_RE.test(String(value || ""))) throw new Error(`${name} must be an exact 40-character SHA`);
  return value;
}

function positiveInteger(value, name) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${name} must be a positive integer`);
  return parsed;
}

export function workflowRunsUrl({ apiUrl, repository, workflow, sha }) {
  const safeApiUrl = required(apiUrl, "apiUrl").replace(/\/$/, "");
  const safeRepository = required(repository, "repository");
  const safeWorkflow = required(workflow, "workflow");
  const safeSha = exactSha(sha, "sha");
  return `${safeApiUrl}/repos/${safeRepository}/actions/workflows/${encodeURIComponent(safeWorkflow)}/runs?event=push&head_sha=${safeSha}&per_page=100`;
}

export function findExactMainPushRun(payload, sha) {
  const safeSha = exactSha(sha, "sha");
  const runs = Array.isArray(payload?.workflow_runs) ? payload.workflow_runs : [];
  return runs.find((run) =>
    run?.event === "push"
    && run?.head_branch === "main"
    && String(run?.head_sha || "").toLowerCase() === safeSha.toLowerCase(),
  ) || null;
}

export async function waitForExactMainPushRun({
  apiUrl,
  repository,
  workflow,
  sha,
  token,
  attempts = DEFAULT_ATTEMPTS,
  intervalMs = DEFAULT_INTERVAL_MS,
  fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const url = workflowRunsUrl({ apiUrl, repository, workflow, sha });
  const safeToken = required(token, "GITHUB_TOKEN");
  const safeAttempts = positiveInteger(attempts, "attempts");
  const safeIntervalMs = positiveInteger(intervalMs, "intervalMs");

  for (let attempt = 1; attempt <= safeAttempts; attempt += 1) {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${safeToken}`,
        "User-Agent": "brai-accepted-production-recovery",
        "X-GitHub-Api-Version": "2026-03-10",
      },
    });
    if (!response.ok) throw new Error(`GitHub Actions workflow-runs query failed: ${response.status} ${response.statusText}`);
    const run = findExactMainPushRun(await response.json(), sha);
    if (run) return { found: true, runId: String(run.id), attemptsUsed: attempt };
    if (attempt < safeAttempts) await sleep(safeIntervalMs);
  }

  return { found: false, runId: "", attemptsUsed: safeAttempts };
}

export function writeGithubOutputs(result, outputPath = process.env.GITHUB_OUTPUT) {
  const output = required(outputPath, "GITHUB_OUTPUT");
  fs.appendFileSync(output, `found=${result.found}\nrun_id=${result.runId}\nattempts=${result.attemptsUsed}\n`);
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error("Usage: await-main-push-run.mjs --repository <owner/repo> --workflow <file> --sha <sha> [--attempts <count>] [--interval-ms <milliseconds>]");
    values[key.slice(2)] = value;
  }
  return values;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await waitForExactMainPushRun({
    apiUrl: process.env.GITHUB_API_URL || "https://api.github.com",
    repository: args.repository,
    workflow: args.workflow,
    sha: args.sha,
    token: process.env.GITHUB_TOKEN,
    attempts: args.attempts || DEFAULT_ATTEMPTS,
    intervalMs: args["interval-ms"] || DEFAULT_INTERVAL_MS,
  });
  writeGithubOutputs(result);
  if (result.found) {
    console.log(`Observed normal main push delivery run ${result.runId} after ${result.attemptsUsed} check(s); recovery is not needed.`);
  } else {
    console.log(`No normal main push delivery run after ${result.attemptsUsed} check(s); dispatching the idempotent production recovery.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
