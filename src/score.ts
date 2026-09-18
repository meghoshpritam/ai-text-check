import type { Issue, Severity } from "./types.js";

const SEVERITY_PENALTY: Record<Severity, number> = {
  error: 15,
  warn: 8,
  info: 3,
};

export const SEVERITY_RANK: Record<Severity, number> = {
  error: 3,
  warn: 2,
  info: 1,
};

export function scoreFromIssues(issues: Issue[]): number {
  let score = 100;
  for (const issue of issues) {
    score -= SEVERITY_PENALTY[issue.severity];
  }
  return Math.max(0, Math.min(100, score));
}

export function hasFailingIssue(issues: Issue[], failOn: Severity): boolean {
  const threshold = SEVERITY_RANK[failOn];
  return issues.some((issue) => SEVERITY_RANK[issue.severity] >= threshold);
}
