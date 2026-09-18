import { createRequire } from "node:module";
import type { Issue, Severity } from "../types.js";
import { excerptAround } from "../scan.js";

type ProseSlopCheck = (
  text: string,
  options?: {
    lang?: string;
    format?: "markdown" | "plain";
    filename?: string;
    disable?: string[];
  },
) => Array<{
  ruleId: string;
  severity: string;
  message: string;
  match: string;
  index: number;
  line: number;
  column: number;
  fixable: boolean;
}>;

const require = createRequire(import.meta.url);
const { check } = require("prose-slop") as { check: ProseSlopCheck };

function toSeverity(value: string): Severity {
  if (value === "error") return "error";
  if (value === "warning" || value === "warn") return "warn";
  return "info";
}

export function runProseSlop(
  text: string,
  options: { format?: "markdown" | "plain" } = {},
): Issue[] {
  const findings = check(text, {
    format: options.format ?? "plain",
    lang: "en",
  });

  return findings.map((finding) => {
    const issue: Issue = {
      rule: `prose-${finding.ruleId}`,
      engine: "prose-slop",
      category: "ai",
      severity: toSeverity(finding.severity),
      message: finding.message,
      line: finding.line,
      column: finding.column,
      excerpt: excerptAround(text, finding.index),
      match: finding.match,
    };
    return issue;
  });
}
