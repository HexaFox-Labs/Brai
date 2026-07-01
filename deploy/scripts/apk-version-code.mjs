import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.env.BRAI_ROOT ?? path.resolve(import.meta.dirname, "../..");
const envsRoot = process.env.BRAI_ENVS_ROOT ?? "/srv/projects/brai-envs";
const statePath = process.env.BRAI_APK_VERSION_CODE_STATE ?? path.join(envsRoot, "apk-version-code.json");
const releaseTargets = [
  process.env.BRAI_RELEASE_TARGET ?? path.join(root, "deploy/releases"),
];
const command = process.argv[2] ?? "next";
const reason = process.argv.slice(3).join(" ").trim() || null;

if (command === "status") {
  console.log(JSON.stringify({ lastVersionCode: currentMax() }, null, 2));
} else if (command === "next") {
  const next = currentMax() + 1;
  writeState(next, reason);
  console.log(String(next));
} else {
  throw new Error("usage: apk-version-code.sh next [reason]|status");
}

function currentMax() {
  let max = 1;
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    max = Math.max(max, Number(state.lastVersionCode) || 0);
  }
  for (const releaseDir of releaseTargets) {
    const indexPath = path.join(releaseDir, "releases.json");
    if (!fs.existsSync(indexPath)) continue;
    const data = JSON.parse(fs.readFileSync(indexPath, "utf8"));
    for (const section of Object.values(data.sections ?? {})) {
      max = Math.max(max, Number(section?.versionCode) || 0);
    }
  }
  return max;
}

function writeState(versionCode, reasonText) {
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  const state = {
    schemaVersion: 1,
    lastVersionCode: versionCode,
    reason: reasonText,
    updatedAt: new Date().toISOString(),
  };
  const tmp = `${statePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(tmp, statePath);
}
