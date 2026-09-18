import path from "node:path";
import type { EngineName, Issue, Severity } from "../types.js";
import { findValeBinary, runVale } from "../node/vale.js";

type ValeAlert = {
  Check?: string;
  Message?: string;
  Line?: number;
  Span?: number[];
  Severity?: string;
  Match?: string;
};

function valeSeverity(value: string | undefined): Severity {
  if (value === "error") return "error";
  if (value === "suggestion") return "info";
  return "warn";
}

function valeCategory(check: string): Issue["category"] {
  if (check.startsWith("write-good.") || check.startsWith("Google.")) {
    return "grammar";
  }
  return "ai";
}

export function collectValeIssues(
  files: string[],
  options: { cwd?: string; extraArgs?: string[] } = {},
): Map<string, Issue[]> {
  const byFile = new Map<string, Issue[]>();
  if (files.length === 0) return byFile;
  if (!findValeBinary(options.cwd)) return byFile;

  const result = runVale(files, {
    extraArgs: ["--output=JSON", ...(options.extraArgs ?? [])],
    ...(options.cwd ? { cwd: options.cwd } : {}),
  });

  if (!result.stdout.trim()) return byFile;

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout) as unknown;
  } catch {
    return byFile;
  }
  if (typeof parsed !== "object" || parsed === null) return byFile;

  for (const [file, alerts] of Object.entries(parsed)) {
    if (!Array.isArray(alerts)) continue;
    const issues: Issue[] = [];
    for (const raw of alerts) {
      const alert = raw as ValeAlert;
      const check = alert.Check ?? "vale";
      const issue: Issue = {
        rule: check,
        engine: "vale" satisfies EngineName,
        category: valeCategory(check),
        severity: valeSeverity(alert.Severity),
        message: alert.Message ?? check,
      };
      if (alert.Line) issue.line = alert.Line;
      if (alert.Span?.[0]) issue.column = alert.Span[0];
      if (alert.Match) issue.match = alert.Match;
      issues.push(issue);
    }
    byFile.set(path.resolve(file), issues);
  }

  return byFile;
}

export function valeIssuesForFile(
  byFile: Map<string, Issue[]>,
  filePath: string,
): Issue[] {
  const resolved = path.resolve(filePath);
  const direct = byFile.get(resolved) ?? byFile.get(filePath);
  if (direct) return direct;

  for (const [key, issues] of byFile) {
    if (path.resolve(key) === resolved) return issues;
  }
  return [];
}
