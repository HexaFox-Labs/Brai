import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { BraiStore } from "../../services/brai_api/src/store.js";

const args = parseArgs(process.argv.slice(2));
const sourceBranch = required(args, "source-branch");
const targetEnvironment = required(args, "target-environment");
const targetBranch = required(args, "target-branch");
const targetCommit = required(args, "target-commit");
const deployedAtUtc = args["deployed-at"] || new Date().toISOString();
const ledgerOnly = args["ledger-only"] === "true";
const recordProductionRelease = args["record-production-release"] === "true";
const targetDb = required(args, "target-db");
fs.mkdirSync(path.dirname(targetDb), { recursive: true });
const target = new BraiStore(targetDb);
let source = null;

try {
  source = openSourceStore(args, targetEnvironment);
  const deploymentRecord = source?.listDeploymentRecords().find((record) => record.branch === sourceBranch) ?? null;
  const sourceRecord = explicitSourceRecord(args, sourceBranch, deploymentRecord);
  if (!sourceRecord) throw new Error(`no deployment metadata for ${sourceBranch}`);

  if (!ledgerOnly) {
    target.recordDeployment({
      environment: targetEnvironment,
      slot: args["target-slot"] || null,
      branch: targetBranch,
      commit: targetCommit,
      domain: required(args, "target-domain"),
      webOtaVersion: args["web-ota-version"] || sourceRecord.web_ota_version,
      apkVersion: args["apk-version"] || sourceRecord.apk_version,
      shortChanges: sourceRecord.short_changes,
      detailedChanges: `Повышено из ${sourceRecord.environment}${sourceRecord.slot ? ` ${sourceRecord.slot}` : ""} (${sourceRecord.branch}@${sourceRecord.commit_sha}). ${sourceRecord.detailed_changes}`,
      reason: args.reason || 'Нужно перенести принятую preview-сборку в production.',
      deployedAtUtc,
    });
  }
  recordAcceptedBuildVersion(target, {
    sourceBranch,
    sourceCommit: sourceRecord.commit_sha,
    sourceShortChanges: sourceRecord.short_changes,
    sourceReason: sourceRecord.reason || args["source-reason"] || args.reason,
    sourceDetails: sourceRecord.detailed_changes,
    targetBranch,
    targetCommit,
    targetEnvironment,
    releasedAtUtc: deployedAtUtc,
  });
  if (recordProductionRelease) recordReleaseVersion(target, {
    sourceBranch,
    sourceCommit: sourceRecord.commit_sha,
    sourceShortChanges: sourceRecord.short_changes,
    sourceReason: sourceRecord.reason || args["source-reason"] || args.reason,
    sourceDetails: sourceRecord.detailed_changes,
    targetBranch,
    targetCommit,
    targetEnvironment,
    releasedAtUtc: deployedAtUtc,
  });
} finally {
  source?.close();
  target.close();
}

function openSourceStore(values, targetEnvironment) {
  const sourceDb = required(values, "source-db");
  try {
    return new BraiStore(sourceDb);
  } catch (error) {
    if (canUseExplicitSourceRecord(values, targetEnvironment)) {
      console.error(`Warning: preview deployment metadata is unavailable; using explicit accepted release notes. ${error.message}`);
      return null;
    }
    throw error;
  }
}

function explicitSourceRecord(values, sourceBranch, deploymentRecord) {
  if (!canUseExplicitSourceRecord(values, values["target-environment"])) return null;
  return {
    environment: "preview",
    slot: values["source-slot"] || null,
    branch: sourceBranch,
    commit_sha: values["source-commit"],
    web_ota_version: values["web-ota-version"] || deploymentRecord?.web_ota_version || null,
    apk_version: values["apk-version"] || deploymentRecord?.apk_version || null,
    short_changes: required(values, "source-short-changes"),
    reason: required(values, "source-reason"),
    detailed_changes: required(values, "source-details"),
  };
}

function recordAcceptedBuildVersion(
  target,
  { sourceBranch, sourceCommit, sourceShortChanges, sourceReason, sourceDetails, targetBranch, targetCommit, targetEnvironment, releasedAtUtc },
) {
  if (targetEnvironment !== "dev" && !(targetEnvironment === "prod" && sourceBranch.startsWith("codex/"))) return;
  const acceptedTargetBranch = targetEnvironment === "prod" ? sourceBranch : targetBranch;
  const acceptedTargetCommit = targetEnvironment === "prod" ? sourceCommit : targetCommit;
  target.recordAcceptedBuildVersion({
    sourceBranch,
    sourceCommit,
    sourceShortChanges,
    sourceReason,
    sourceDetails,
    targetBranch: acceptedTargetBranch,
    targetCommit: acceptedTargetCommit,
    releasedAtUtc,
  });
}

function canUseExplicitSourceRecord(values, targetEnvironment) {
  return Boolean(
    values["source-commit"] &&
    values["source-short-changes"] &&
    values["source-details"] &&
    values["source-reason"] &&
    (targetEnvironment === "dev" || (targetEnvironment === "prod" && values["source-branch"]?.startsWith("codex/")))
  );
}

function recordReleaseVersion(
  target,
  { sourceBranch, sourceCommit, sourceShortChanges, sourceReason, sourceDetails, targetBranch, targetCommit, targetEnvironment, releasedAtUtc },
) {
  if (targetEnvironment !== "prod") return;
  target.recordReleaseVersion({
    sourceBranch,
    sourceCommit,
    sourceShortChanges,
    sourceReason,
    sourceDetails,
    targetBranch,
    targetCommit,
    releasedAtUtc,
  });
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 2) {
    const key = values[index];
    if (!key?.startsWith("--")) throw new Error(`invalid argument: ${key}`);
    parsed[key.slice(2)] = values[index + 1] ?? "";
  }
  return parsed;
}

function required(values, key) {
  const value = values[key];
  if (!value) throw new Error(`missing --${key}`);
  return value;
}
