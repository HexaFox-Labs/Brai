import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.env.BRIGHT_OS_ROOT ?? path.resolve(import.meta.dirname, "../..");
const envsRoot = process.env.BRIGHT_OS_ENVS_ROOT ?? "/srv/projects/bright-os-envs";
const registryPath = process.env.BRIGHT_OS_PREVIEW_REGISTRY ?? path.join(envsRoot, "preview-slots.json");
const statusDir = process.env.BRIGHT_OS_PREVIEW_STATUS_DIR ?? path.join(envsRoot, "preview-status");
const environments = JSON.parse(fs.readFileSync(path.join(root, "deploy/environments.json"), "utf8")).environments;
const slots = ["A", "B", "C", "D", "E"];
const [command, ...args] = process.argv.slice(2);

try {
  const registry = readRegistry();
  const now = new Date().toISOString();
  let result;

  switch (command) {
    case "init":
      result = { ok: true, registry };
      break;
    case "allocate":
      result = allocate(registry, args[0], args[1], now);
      break;
    case "ready":
      result = updateOwnedSlot(registry, args[0], args[1], now, "ready");
      break;
    case "failed":
      result = updateOwnedSlot(registry, args[0], args[1], now, "failed");
      break;
    case "release":
      result = release(registry, args[0], now);
      break;
    case "status":
      result = { ok: true, registry };
      break;
    default:
      throw new Error("usage: preview-slots.sh init|status|allocate <branch> <commit>|ready <branch> <commit>|failed <branch> <commit>|release <branch-or-slot>");
  }

  writeRegistry(registry);
  renderStatusPage(registry);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function allocate(registry, branch, commit, now) {
  requireBranch(branch);
  const existing = findByBranch(registry, branch);
  if (existing) {
    Object.assign(existing.entry, {
      status: "deploying",
      commit: commit ?? null,
      updated_at: now,
    });
    return { ok: true, allocatedNew: false, slot: existing.slot, entry: existing.entry };
  }

  const slot = slots.find((candidate) => registry[candidate].status === "free");
  if (!slot) throw new Error("no preview slot available");
  const entry = registry[slot];
  Object.assign(entry, {
    status: "deploying",
    branch,
    commit: commit ?? null,
    assigned_at: now,
    updated_at: now,
  });
  return { ok: true, allocatedNew: true, slot, entry };
}

function updateOwnedSlot(registry, branch, commit, now, status) {
  requireBranch(branch);
  const existing = findByBranch(registry, branch);
  if (!existing) throw new Error(`branch has no preview slot: ${branch}`);
  Object.assign(existing.entry, {
    status,
    commit: commit ?? existing.entry.commit,
    updated_at: now,
  });
  return { ok: true, slot: existing.slot, entry: existing.entry };
}

function release(registry, branchOrSlot, now) {
  if (!branchOrSlot) throw new Error("release requires a branch or slot");
  const normalizedSlot = branchOrSlot.toUpperCase();
  const existing = slots.includes(normalizedSlot)
    ? { slot: normalizedSlot, entry: registry[normalizedSlot] }
    : findByBranch(registry, branchOrSlot);
  if (!existing) return { ok: true, released: false };
  const base = defaultSlot(existing.slot);
  Object.assign(existing.entry, base, {
    released_at: now,
    updated_at: now,
  });
  return { ok: true, released: true, slot: existing.slot, entry: existing.entry };
}

function findByBranch(registry, branch) {
  for (const slot of slots) {
    if (registry[slot].branch === branch) return { slot, entry: registry[slot] };
  }
  return null;
}

function readRegistry() {
  const initial = Object.fromEntries(slots.map((slot) => [slot, defaultSlot(slot)]));
  if (!fs.existsSync(registryPath)) return initial;
  const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  for (const slot of slots) {
    parsed[slot] = { ...defaultSlot(slot), ...(parsed[slot] ?? {}) };
  }
  return Object.fromEntries(slots.map((slot) => [slot, parsed[slot]]));
}

function writeRegistry(registry) {
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  const tmp = `${registryPath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(registry, null, 2)}\n`);
  fs.renameSync(tmp, registryPath);
}

function defaultSlot(slot) {
  const env = environments[`preview-${slot.toLowerCase()}`];
  return {
    status: "free",
    branch: null,
    commit: null,
    url: `https://${env.domain}`,
    android_app: env.androidApp,
    display_label: slot,
    assigned_at: null,
    updated_at: null,
  };
}

function renderStatusPage(registry) {
  fs.mkdirSync(statusDir, { recursive: true });
  const cards = slots
    .map((slot) => {
      const entry = registry[slot];
      const commit = entry.commit ? entry.commit.slice(0, 12) : "none";
      return `<section class="slot slot-${escapeHtml(entry.status)}">
        <h2>${slot}</h2>
        <dl>
          <div><dt>Status</dt><dd>${escapeHtml(entry.status)}</dd></div>
          <div><dt>Branch</dt><dd>${escapeHtml(entry.branch ?? "free")}</dd></div>
          <div><dt>Commit</dt><dd>${escapeHtml(commit)}</dd></div>
          <div><dt>URL</dt><dd><a href="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</a></dd></div>
          <div><dt>Android</dt><dd>${escapeHtml(entry.android_app)}</dd></div>
        </dl>
      </section>`;
    })
    .join("\n");
  fs.writeFileSync(
    path.join(statusDir, "index.html"),
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Bright OS Preview Slots</title>
  <style>
    :root { color-scheme: dark; font-family: system-ui, sans-serif; background: #0c1110; color: #edf7f4; }
    body { margin: 0; padding: 32px; }
    main { max-width: 980px; margin: 0 auto; }
    h1 { margin: 0 0 22px; font-size: 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .slot { border: 1px solid #2a3935; border-radius: 8px; padding: 16px; background: #121a18; }
    .slot-free { opacity: .72; }
    h2 { margin: 0 0 12px; font-size: 24px; }
    dl { display: grid; gap: 8px; margin: 0; }
    div { min-width: 0; }
    dt { color: #9fb0ab; font-size: 12px; text-transform: uppercase; }
    dd { margin: 2px 0 0; overflow-wrap: anywhere; }
    a { color: #4cc3ad; }
  </style>
</head>
<body>
  <main>
    <h1>Bright OS Preview Slots</h1>
    <div class="grid">${cards}</div>
  </main>
</body>
</html>
`,
  );
}

function requireBranch(branch) {
  if (!branch) throw new Error("branch is required");
  if (!branch.startsWith("codex/")) throw new Error(`preview branches must start with codex/: ${branch}`);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
