import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

function packageRoot(): string {
  let current = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    const ini = path.join(current, "vale", "vale.ini");
    const pkg = path.join(current, "package.json");
    if (fs.existsSync(ini) && fs.existsSync(pkg)) return current;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function valeNativeCandidates(root: string): string[] {
  const valeRoot = path.join(root, "node_modules", "@vvago", "vale");
  return [
    path.join(
      valeRoot,
      "native",
      process.platform === "win32" ? "vale.exe" : "vale",
    ),
    path.join(valeRoot, "bin", "vale"),
  ];
}

function firstExisting(paths: string[]): string | null {
  for (const candidate of paths) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

export function findValeBinary(cwd: string = process.cwd()): string | null {
  if (process.env.VALE_BIN && fs.existsSync(process.env.VALE_BIN)) {
    return process.env.VALE_BIN;
  }

  const fromCwd = firstExisting(valeNativeCandidates(cwd));
  if (fromCwd) return fromCwd;

  const fromPackage = firstExisting(valeNativeCandidates(packageRoot()));
  if (fromPackage) return fromPackage;

  try {
    const pkg = require.resolve("@vvago/vale/package.json");
    const dir = path.dirname(pkg);
    const resolved = firstExisting([
      path.join(
        dir,
        "native",
        process.platform === "win32" ? "vale.exe" : "vale",
      ),
      path.join(dir, "bin", "vale"),
    ]);
    if (resolved) return resolved;
  } catch {
    // Package is not installed next to this module.
  }

  const which = spawnSync(
    process.platform === "win32" ? "where" : "which",
    ["vale"],
    { encoding: "utf8" },
  );
  const found = which.stdout?.trim().split("\n")[0];
  return found && fs.existsSync(found) ? found : null;
}

export function bundledValeIni(): string {
  return path.join(packageRoot(), "vale", "vale.ini");
}

export type ValeRunResult = {
  status: number;
  stdout: string;
  stderr: string;
};

export function runVale(
  files: string[],
  options: { cwd?: string; extraArgs?: string[]; configPath?: string } = {},
): ValeRunResult {
  const cwd = options.cwd ?? process.cwd();
  const binary = findValeBinary(cwd);
  if (!binary) {
    throw new Error(
      "Vale is not installed. Add `@vvago/vale` and rerun npm install so the native binary is downloaded.",
    );
  }

  const args = [...(options.extraArgs ?? [])];
  const configPath = options.configPath ?? path.join(cwd, ".vale.ini");
  if (fs.existsSync(configPath)) {
    args.push("--config", configPath);
  } else if (fs.existsSync(bundledValeIni())) {
    args.push("--config", bundledValeIni());
  }
  args.push(...files.map((file) => path.resolve(cwd, file)));

  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.error?.message ?? "",
  };
}
