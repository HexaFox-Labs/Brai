#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const bin = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "openspec.cmd" : "openspec");

if (!existsSync(bin)) {
  console.error("Missing local OpenSpec CLI. Run `npm install` at the repository root.");
  process.exit(1);
}

const result = spawnSync(bin, process.argv.slice(2), {
  env: { OPENSPEC_TELEMETRY: "0", ...process.env },
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
