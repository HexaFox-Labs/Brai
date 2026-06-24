import process from "node:process";
import { TimerStore } from "../../services/timer_api/src/store.js";

const args = parseArgs(process.argv.slice(2));
const source = new TimerStore(required(args, "source-db"));
const target = new TimerStore(required(args, "target-db"));

try {
  const sourceBranch = required(args, "source-branch");
  const sourceRecord = source
    .listDeploymentRecords()
    .find((record) => record.branch === sourceBranch);
  if (!sourceRecord) throw new Error(`no deployment metadata for ${sourceBranch}`);

  target.recordDeployment({
    environment: required(args, "target-environment"),
    slot: args["target-slot"] || null,
    branch: required(args, "target-branch"),
    commit: required(args, "target-commit"),
    domain: required(args, "target-domain"),
    webOtaVersion: args["web-ota-version"] || sourceRecord.web_ota_version,
    apkVersion: args["apk-version"] || sourceRecord.apk_version,
    shortChanges: sourceRecord.short_changes,
    detailedChanges: `Promoted from ${sourceRecord.environment}${sourceRecord.slot ? ` ${sourceRecord.slot}` : ""} (${sourceRecord.branch}@${sourceRecord.commit_sha}). ${sourceRecord.detailed_changes}`,
    reason: args.reason || `Promoted accepted deployment from ${sourceBranch}`,
    deployedAtUtc: args["deployed-at"] || new Date().toISOString(),
  });
} finally {
  source.close();
  target.close();
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
