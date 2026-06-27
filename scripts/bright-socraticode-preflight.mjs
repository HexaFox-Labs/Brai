#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const requiredFiles = [
  ".socraticodecontextartifacts.json",
  "docs/guidelines/10-agent-tools-openspec.md",
  "openspec/specs/project-governance/spec.md",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) fail(`Missing SocratiCode project files:\n${missing.map((file) => `- ${file}`).join("\n")}`);

const artifacts = JSON.parse(fs.readFileSync(path.join(root, ".socraticodecontextartifacts.json"), "utf8"));
const artifactPaths = (artifacts.artifacts ?? []).map((artifact) => artifact.path);
for (const expected of ["./docs", "./openspec", "./memory-bank"]) {
  if (!artifactPaths.includes(expected)) fail(`.socraticodecontextartifacts.json does not include ${expected}`);
}

const codexConfig = path.join(os.homedir(), ".codex", "config.toml");
if (!fs.existsSync(codexConfig)) fail(`Codex config not found: ${codexConfig}`);
const configText = fs.readFileSync(codexConfig, "utf8");
if (!/\[mcp_servers\.socraticode\]/.test(configText)) fail("Codex MCP config has no [mcp_servers.socraticode] section");

const projectHash = crypto.createHash("sha256").update(root).digest("hex").slice(0, 12);
const lockDir = path.join(os.tmpdir(), "socraticode-locks", `${projectHash}-watch.lock`);
const pidPath = path.join(os.tmpdir(), "socraticode-locks", `${projectHash}-watch`);
if (!fs.existsSync(lockDir) || !fs.existsSync(pidPath)) {
  fail(
    `SocratiCode watcher lock is missing for ${root}.\n` +
      "Run SocratiCode MCP: codebase_status, then codebase_watch { action: \"start\" } or codebase_index for this projectPath.",
  );
}
const pid = Number(fs.readFileSync(pidPath, "utf8").trim());
if (!Number.isInteger(pid) || pid <= 0) fail(`SocratiCode watcher PID file is invalid: ${pidPath}`);

console.log(`SocratiCode preflight OK for ${root}`);

function fail(message) {
  console.error(message);
  process.exit(1);
}
