import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function findSlopGateBinary(cwd: string = process.cwd()): string | null {
  const candidates = [
    path.join(cwd, "node_modules", "slop-gate", "bin", "slop-gate.js"),
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "node_modules",
      "slop-gate",
      "bin",
      "slop-gate.js",
    ),
  ];
  for (const local of candidates) {
    if (fs.existsSync(local)) return local;
  }
  return null;
}

export type SlopGateRunResult = {
  status: number;
  stdout: string;
  stderr: string;
};

export function runSlopGate(
  files: string[],
  options: { cwd?: string; configPath?: string } = {},
): SlopGateRunResult {
  const cwd = options.cwd ?? process.cwd();
  const binary = findSlopGateBinary(cwd);
  if (!binary) {
    throw new Error(
      "slop-gate is not installed. Add `slop-gate` as a dependency.",
    );
  }

  const args = [binary, ...files];
  const configPath =
    options.configPath ?? path.join(cwd, "slop-gate.config.json");
  if (fs.existsSync(configPath)) {
    args.push("--config", configPath);
  }

  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
  });

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.error?.message ?? "",
  };
}
