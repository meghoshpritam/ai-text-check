import fs from "node:fs";
import path from "node:path";
import type { ResolvedConfig } from "../types.js";

const DEFAULT_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".next",
  "out",
  "tmp",
  ".cache",
  ".turbo",
  ".vale",
]);

export function collectFiles(
  roots: string[],
  config: ResolvedConfig,
): string[] {
  const files = new Set<string>();
  const skipDirs = new Set(DEFAULT_SKIP_DIRS);
  for (const extra of config.exclude) {
    skipDirs.add(extra);
  }

  const shouldInclude = (filePath: string): boolean => {
    const ext = path.extname(filePath).toLowerCase();
    if (!config.extensions.includes(ext)) return false;
    const relative = filePath.split(path.sep).join("/");
    if (config.include.length > 0) {
      return config.include.some((item) => relative.includes(item));
    }
    return true;
  };

  const walk = (itemPath: string): void => {
    if (!fs.existsSync(itemPath)) return;
    const stat = fs.statSync(itemPath);
    if (stat.isDirectory()) {
      if (skipDirs.has(path.basename(itemPath))) return;
      for (const child of fs.readdirSync(itemPath)) {
        walk(path.join(itemPath, child));
      }
      return;
    }
    if (stat.isFile() && shouldInclude(itemPath)) {
      files.add(path.resolve(itemPath));
    }
  };

  for (const root of roots) {
    walk(path.resolve(root));
  }

  return [...files].sort();
}
