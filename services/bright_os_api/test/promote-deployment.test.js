import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrightOsStore } from '../src/store.js';

test('accepted preview promotion records a PR-matched build version once', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bright-promote-ledger-'));
  const targetDb = path.join(tmp, 'target.sqlite');
  const store = new BrightOsStore(targetDb);

  try {
    const accepted = {
      prNumber: '11',
      sourceBranch: 'codex/example',
      sourceCommit: 'abc123',
      sourceDetails: 'Automated preview deploy.',
      targetBranch: 'dev',
      targetCommit: 'def456',
      deployedAtUtc: '2026-06-24T22:00:00.000Z'
    };
    store.recordAcceptedBuildVersion({ ...accepted, releasedAtUtc: '2026-06-24T22:10:00.000Z' });
    store.recordAcceptedBuildVersion({ ...accepted, releasedAtUtc: '2026-06-24T22:10:00.000Z' });

    const version = store.db
      .prepare("SELECT * FROM build_versions WHERE version_type_id = 'build' AND version = '0.0.11.1'")
      .get();
    assert.ok(version);
    assert.equal(version.build_version, 11);
    assert.equal(version.reason, 'Accepted PR #11 into dev.');
    assert.equal(version.released_at_utc, '2026-06-24T22:10:00.000Z');
    assert.match(version.detailed_changes, /codex\/example@abc123 promoted to dev@def456/);
    assert.equal(
      store.db.prepare("SELECT COUNT(*) AS count FROM build_versions WHERE version_type_id = 'build'").get().count,
      11
    );
  } finally {
    store.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('production promotion copies accepted dev build ledger', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bright-promote-prod-ledger-'));
  const sourceDb = path.join(tmp, 'source.sqlite');
  const targetDb = path.join(tmp, 'target.sqlite');
  const source = new BrightOsStore(sourceDb);
  const target = new BrightOsStore(targetDb);

  try {
    source.recordAcceptedBuildVersion({
      prNumber: '12',
      sourceBranch: 'codex/example-12',
      sourceCommit: 'abc12',
      sourceDetails: 'Accepted PR 12.',
      targetBranch: 'dev',
      targetCommit: 'def12',
      releasedAtUtc: '2026-06-25T12:00:00.000Z'
    });
    source.recordAcceptedBuildVersion({
      prNumber: '13',
      sourceBranch: 'codex/example-13',
      sourceCommit: 'abc13',
      sourceDetails: 'Accepted PR 13.',
      targetBranch: 'dev',
      targetCommit: 'def13',
      releasedAtUtc: '2026-06-25T13:00:00.000Z'
    });
    source.recordDeployment({
      environment: 'dev',
      branch: 'dev',
      commit: 'devsha',
      domain: 'dev.brightos.world',
      webOtaVersion: '0.0.13.1.20260625130000',
      shortChanges: 'Dev accepted changes.',
      detailedChanges: 'Latest accepted dev deployment.',
      reason: 'Automated dev deployment',
      deployedAtUtc: '2026-06-25T13:01:00.000Z'
    });
  } finally {
    source.close();
    target.close();
  }

  const repoRoot = path.resolve(import.meta.dirname, '../../..');
  execFileSync(process.execPath, [
    path.join(repoRoot, 'deploy/scripts/promote-deployment.mjs'),
    '--source-db',
    sourceDb,
    '--target-db',
    targetDb,
    '--source-branch',
    'dev',
    '--target-environment',
    'prod',
    '--target-branch',
    'main',
    '--target-commit',
    'mainsha',
    '--target-domain',
    'app.brightos.world',
    '--reason',
    'Promote dev to production'
  ], { cwd: repoRoot });

  const promoted = new BrightOsStore(targetDb);
  try {
    const latest = promoted.db
      .prepare("SELECT build_version, version FROM build_versions WHERE version_type_id = 'build' ORDER BY build_version DESC LIMIT 1")
      .get();
    assert.deepEqual(latest, { build_version: 13, version: '0.0.13.1' });

    const prodRecord = promoted.db
      .prepare("SELECT environment, branch, web_ota_version FROM deployment_records WHERE environment = 'prod' ORDER BY id DESC LIMIT 1")
      .get();
    assert.deepEqual(prodRecord, {
      environment: 'prod',
      branch: 'main',
      web_ota_version: '0.0.13.1.20260625130000'
    });
  } finally {
    promoted.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
