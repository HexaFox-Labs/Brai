import process from "node:process";
import { BraiStore } from "../../services/brai_api/src/store.js";

const args = parseArgs(process.argv.slice(2));
const store = new BraiStore(required(args, "db"));

try {
  store.recordAcceptedBuildVersion({
    sourceBranch: required(args, "source-branch"),
    sourceCommit: required(args, "source-commit"),
    sourceShortChanges: required(args, "source-short-changes"),
    sourceReason: required(args, "source-reason"),
    sourceDetails: required(args, "source-details"),
    targetBranch: required(args, "target-branch"),
    targetCommit: required(args, "target-commit"),
    releasedAtUtc: args["released-at"] || new Date().toISOString(),
  });
} finally {
  store.close();
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
