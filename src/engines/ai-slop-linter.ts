import { lintText } from "ai-slop-linter";
import type { Issue, Severity } from "../types.js";

function toSeverity(value: string): Severity {
  if (value === "error") return "error";
  if (value === "warning" || value === "warn") return "warn";
  return "info";
}

export function runAiSlopLinter(
  text: string,
  options: { source?: string } = {},
): Issue[] {
  const result = lintText(options.source ?? "<text>", text, { floor: 0 });
  return result.findings.map((finding) => {
    const issue: Issue = {
      rule: `asl-${finding.rule}`,
      engine: "ai-slop-linter",
      category: "ai",
      severity: toSeverity(finding.severity),
      message: finding.message,
      line: finding.line,
      column: finding.column,
      excerpt: finding.excerpt,
    };
    return issue;
  });
}
