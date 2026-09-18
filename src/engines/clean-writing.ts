import { lint } from "clean-writing-lint";
import type { Issue, Severity } from "../types.js";
import { excerptAround } from "../scan.js";

const AI_RULES = new Set([
  "banned-word",
  "marketing-adjective",
  "filler",
  "banned-construction",
  "em-dash",
]);

function toSeverity(value: string): Severity {
  if (value === "error") return "error";
  if (value === "warn") return "warn";
  return "info";
}

export function runCleanWriting(text: string): Issue[] {
  const report = lint(text, {
    maxSentenceWords: 35,
    rules: {
      contraction: "off",
      semicolon: "off",
      "long-sentence": "off",
      "long-paragraph": "off",
    },
  });

  return report.violations.map((violation) => {
    const issue: Issue = {
      rule: `cws-${violation.rule}`,
      engine: "clean-writing",
      category: AI_RULES.has(violation.rule) ? "ai" : "grammar",
      severity: toSeverity(violation.severity),
      message: violation.message,
      line: violation.line,
      column: violation.column,
      excerpt: excerptAround(text, violation.index),
      match: text.slice(violation.index, violation.index + violation.length),
    };
    return issue;
  });
}
