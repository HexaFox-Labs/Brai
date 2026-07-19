import assert from "node:assert/strict";
import test from "node:test";

import {
  findExactMainPushRun,
  waitForExactMainPushRun,
  workflowRunsUrl,
} from "./await-main-push-run.mjs";

const sha = "a".repeat(40);

test("workflow-runs URL queries the exact pushed SHA", () => {
  assert.equal(
    workflowRunsUrl({
      apiUrl: "https://api.github.com/",
      repository: "HexaFox-Labs/Brai",
      workflow: "brai-delivery.yml",
      sha,
    }),
    `https://api.github.com/repos/HexaFox-Labs/Brai/actions/workflows/brai-delivery.yml/runs?event=push&head_sha=${sha}&per_page=100`,
  );
});

test("only an exact main push run suppresses recovery", () => {
  const payload = {
    workflow_runs: [
      { id: 1, event: "pull_request", head_branch: "main", head_sha: sha },
      { id: 2, event: "push", head_branch: "codex/test", head_sha: sha },
      { id: 3, event: "push", head_branch: "main", head_sha: "b".repeat(40) },
      { id: 4, event: "push", head_branch: "main", head_sha: sha },
    ],
  };
  assert.equal(findExactMainPushRun(payload, sha)?.id, 4);
});

test("recovery waits for a delayed normal push run", async () => {
  let requests = 0;
  let sleeps = 0;
  const result = await waitForExactMainPushRun({
    apiUrl: "https://api.github.com",
    repository: "HexaFox-Labs/Brai",
    workflow: "brai-delivery.yml",
    sha,
    token: "test-token",
    attempts: 3,
    intervalMs: 1,
    fetchImpl: async () => {
      requests += 1;
      return {
        ok: true,
        json: async () => ({ workflow_runs: requests === 2 ? [{ id: 42, event: "push", head_branch: "main", head_sha: sha }] : [] }),
      };
    },
    sleep: async () => { sleeps += 1; },
  });
  assert.deepEqual(result, { found: true, runId: "42", attemptsUsed: 2 });
  assert.equal(sleeps, 1);
});

test("recovery proceeds only after every exact-push check is absent", async () => {
  const result = await waitForExactMainPushRun({
    apiUrl: "https://api.github.com",
    repository: "HexaFox-Labs/Brai",
    workflow: "brai-delivery.yml",
    sha,
    token: "test-token",
    attempts: 2,
    intervalMs: 1,
    fetchImpl: async () => ({ ok: true, json: async () => ({ workflow_runs: [] }) }),
    sleep: async () => {},
  });
  assert.deepEqual(result, { found: false, runId: "", attemptsUsed: 2 });
});
