#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const changesDir = join(process.cwd(), "openspec", "changes");

if (!existsSync(changesDir)) {
  process.exit(0);
}

const checkedTask = /^\s*[-*]\s+\[[xX]\]\s+/;
const openTask = /^\s*[-*]\s+\[\s\]\s+/;
const completedActiveChanges = [];

for (const entry of readdirSync(changesDir, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === "archive") {
    continue;
  }

  const tasksPath = join(changesDir, entry.name, "tasks.md");
  if (!existsSync(tasksPath)) {
    continue;
  }

  const taskLines = readFileSync(tasksPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => checkedTask.test(line) || openTask.test(line));

  if (taskLines.length > 0 && taskLines.every((line) => checkedTask.test(line))) {
    completedActiveChanges.push(entry.name);
  }
}

if (completedActiveChanges.length > 0) {
  console.error(
    [
      "Completed OpenSpec changes are still active:",
      ...completedActiveChanges.map((change) => `- ${change}`),
      "",
      "Archive them or leave an explicit unchecked task before running OpenSpec validation.",
    ].join("\n"),
  );
  process.exit(1);
}
