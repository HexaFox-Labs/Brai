import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const ROOT = process.env.BRAI_ROOT ?? DEFAULT_ROOT;

export async function deployBranch({ branch, sha, baseSha = "" }) {
  assertSafeBranch(branch);
  assertSafeSha(sha);

  return withSourceCheckout({ branch, sha }, async (cwd) => {
    const result = await runExistingScript("deploy/scripts/ci-ssh-deploy.sh", [], {
      cwd,
      env: await deployEnv({
        BRAI_BRANCH: branch,
        BRAI_COMMIT: sha,
        BRAI_BASE_COMMIT: baseSha
      })
    });
    return {
      ...result,
      previewSlot: parsePreviewSlot(result.stdout)
    };
  });
}

export async function enableNoPreviewAutoMerge({ branch, sha }) {
  assertSafeBranch(branch);
  assertSafeSha(sha);

  return withSourceCheckout({ branch, sha }, async (cwd) =>
    runExistingScript("deploy/scripts/accept-preview.sh", [branch], {
      cwd,
      env: await deployEnv({
        BRAI_BRANCH: branch,
        BRAI_ACCEPT_NO_PREVIEW_ONLY: "true",
        BRAI_ACCEPT_ALLOW_DETACHED_ROOT: "true"
      })
    })
  );
}

export async function completeAcceptedPreviews({ targetBranch = "main", targetEnvironment = "prod", targetCommit, mode }) {
  assertSafeBranch(targetBranch);
  assertSafeSha(targetCommit);
  if (!["all", "promote", "release"].includes(mode)) throw new Error(`Unsupported accepted preview mode: ${mode}`);

  return withSourceCheckout({ branch: targetBranch, sha: targetCommit }, async (cwd) =>
    runExistingScript("deploy/scripts/ci-ssh-complete-accepted-previews.sh", [], {
      cwd,
      env: await deployEnv({
        BRAI_TARGET_BRANCH: targetBranch,
        BRAI_TARGET_ENVIRONMENT: targetEnvironment,
        BRAI_TARGET_COMMIT: targetCommit,
        BRAI_ACCEPTED_PREVIEWS_MODE: mode,
        BRAI_TEMPORAL_REQUIRED: process.env.BRAI_TEMPORAL_REQUIRED ?? "true"
      })
    })
  );
}

export async function releasePreviewSlot({ branch, requireRelease = false, acceptedPreview = false }) {
  assertSafeBranch(branch);

  const result = await runExistingScript("deploy/scripts/ci-ssh-release-slot.sh", [], {
    cwd: ROOT,
    env: await deployEnv({
      BRAI_BRANCH: branch,
      BRAI_REQUIRE_PREVIEW_SLOT_RELEASE: requireRelease ? "true" : "false",
      BRAI_ACCEPTED_PREVIEW: acceptedPreview ? "true" : "false"
    })
  });
  return {
    ...result,
    released: parseReleased(result.stdout)
  };
}

export async function cleanupAcceptedBranches({ branch = "", recentMerged = false } = {}) {
  const args = [];
  if (branch) {
    assertSafeBranch(branch);
    args.push("--branch", branch);
  } else if (recentMerged) {
    args.push("--recent-merged");
  }

  return runExistingScript("deploy/scripts/ci-cleanup-accepted-branches.sh", args, {
    cwd: ROOT,
    env: await deployEnv({ BRAI_TARGET_BRANCH: "main" })
  });
}

export async function syncMainCheckout({ sha, restartTemporalWorker = false }) {
  assertSafeSha(sha);
  return runExistingScript("deploy/scripts/ci-ssh-sync-main-checkout.sh", [], {
    cwd: ROOT,
    env: await deployEnv({
      BRAI_COMMIT: sha,
      BRAI_RESTART_TEMPORAL_WORKER: restartTemporalWorker ? "true" : "false"
    })
  });
}

async function withSourceCheckout({ branch, sha }, callback) {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "brai-temporal-source-"));
  const checkout = path.join(tempRoot, "source");
  try {
    const origin = await runCommand("git", ["-C", ROOT, "remote", "get-url", "origin"]);
    await runCommand("git", ["clone", "--no-checkout", ROOT, checkout]);
    await runCommand("git", ["-C", checkout, "remote", "set-url", "origin", origin.stdout.trim()]);
    await fetchBranch(checkout, branch);
    await runCommand("git", ["-C", checkout, "checkout", "--detach", sha]);
    return await callback(checkout);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

async function fetchBranch(checkout, branch) {
  await runCommand("git", [
    "-C",
    checkout,
    "fetch",
    "--no-tags",
    "origin",
    `+refs/heads/${branch}:refs/remotes/origin/${branch}`
  ]);
}

async function deployEnv(extra = {}) {
  const env = {
    ...process.env,
    ...extra
  };

  copyEnv(env, "BRAI_TEMPORAL_DEPLOY_HOST", "BRAI_DEPLOY_HOST");
  copyEnv(env, "BRAI_TEMPORAL_DEPLOY_USER", "BRAI_DEPLOY_USER");
  copyEnv(env, "BRAI_TEMPORAL_DEPLOY_SSH_PORT", "BRAI_DEPLOY_SSH_PORT");
  copyEnv(env, "BRAI_TEMPORAL_DEPLOY_REPO", "BRAI_DEPLOY_REPO");

  if (!env.BRAI_DEPLOY_SSH_KEY && env.BRAI_TEMPORAL_DEPLOY_SSH_KEY_PATH) {
    env.BRAI_DEPLOY_SSH_KEY = await readTextSecret(env.BRAI_TEMPORAL_DEPLOY_SSH_KEY_PATH);
  }

  const token = env.BRAI_TEMPORAL_GITHUB_TOKEN_PATH
    ? await readTextSecret(env.BRAI_TEMPORAL_GITHUB_TOKEN_PATH)
    : env.BRAI_TEMPORAL_GITHUB_TOKEN;
  if (token && !env.GITHUB_TOKEN) env.GITHUB_TOKEN = token.trim();
  if (token && !env.GH_TOKEN) env.GH_TOKEN = token.trim();

  return env;
}

function copyEnv(env, from, to) {
  if (env[from] && !env[to]) env[to] = env[from];
}

async function readTextSecret(filePath) {
  return readFile(filePath, "utf8");
}

function runExistingScript(script, args, { cwd, env }) {
  return runCommand(path.join(cwd, script), args, { cwd, env });
}

function runCommand(command, args, { cwd = ROOT, env = process.env, allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const result = { code, stdout, stderr };
      if (code === 0 || allowFailure) resolve(result);
      else reject(Object.assign(new Error(`${command} exited ${code}: ${stderr || stdout}`), result));
    });
  });
}

function parsePreviewSlot(output) {
  return String(output ?? "")
    .split("\n")
    .map((line) => line.match(/^BRAI_PREVIEW_SLOT_OUTPUT=(.+)$/)?.[1] ?? "")
    .filter(Boolean)
    .at(-1) ?? "";
}

function parseReleased(output) {
  const jsonLine = String(output ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.endsWith("}"))
    .at(-1);
  if (!jsonLine) return false;
  try {
    return JSON.parse(jsonLine).released === true;
  } catch {
    return false;
  }
}

function assertSafeBranch(branch) {
  if (!/^(main|dev|codex\/[A-Za-z0-9._-]+)$/.test(String(branch ?? ""))) {
    throw new Error(`Unsupported branch for Temporal activity: ${branch || "<empty>"}`);
  }
}

function assertSafeSha(sha) {
  if (!/^[0-9a-f]{7,64}$/i.test(String(sha ?? ""))) {
    throw new Error(`Unsupported commit sha for Temporal activity: ${sha || "<empty>"}`);
  }
}
