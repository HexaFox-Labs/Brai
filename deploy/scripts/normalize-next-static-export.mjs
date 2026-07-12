import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export function normalizeNextStaticExport(outDir) {
  const root = path.resolve(outDir);
  const written = [];
  for (const filePath of listHtmlFiles(root)) {
    const relative = path.relative(root, filePath);
    if (shouldSkipHtmlRoute(relative)) continue;
    const parsed = path.parse(relative);
    const routeDir = path.join(root, parsed.dir, parsed.name);
    const indexPath = path.join(routeDir, "index.html");
    fs.mkdirSync(routeDir, { recursive: true });
    fs.copyFileSync(filePath, indexPath);
    written.push(path.relative(root, indexPath));
  }
  return written.sort();
}

function listHtmlFiles(dir) {
  if (!fs.existsSync(dir)) throw new Error(`Missing static export directory: ${dir}`);
  const htmlFiles = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_next") continue;
      htmlFiles.push(...listHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      htmlFiles.push(fullPath);
    }
  }
  return htmlFiles;
}

function shouldSkipHtmlRoute(relative) {
  const normalized = relative.split(path.sep).join("/");
  return normalized === "index.html" || normalized === "404.html" || normalized === "_not-found.html" || normalized.endsWith("/index.html");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outDir = process.argv[2];
  if (!outDir) {
    console.error("Usage: normalize-next-static-export.mjs <out-dir>");
    process.exit(1);
  }
  const written = normalizeNextStaticExport(outDir);
  console.log(`Normalized ${written.length} static route index files.`);
}
