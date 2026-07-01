import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: turbopackRoot(projectRoot),
  },
};

function turbopackRoot(root: string): string {
  const linkedNodeModules = realPathOrNull(path.join(root, "node_modules"));
  if (!linkedNodeModules || isInside(linkedNodeModules, root)) return root;
  return commonPath(root, linkedNodeModules);
}

function realPathOrNull(target: string): string | null {
  try {
    return fs.realpathSync(target);
  } catch {
    return null;
  }
}

function isInside(target: string, root: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function commonPath(left: string, right: string): string {
  const leftParts = path.resolve(left).split(path.sep);
  const rightParts = path.resolve(right).split(path.sep);
  const commonParts = [];
  for (let index = 0; index < leftParts.length && leftParts[index] === rightParts[index]; index += 1) {
    commonParts.push(leftParts[index]);
  }
  return commonParts.join(path.sep) || path.sep;
}

export default nextConfig;
