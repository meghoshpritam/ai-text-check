import { analyze } from "is-this-ai-slop";
import type { Issue } from "../types.js";
import { columnAt, excerptAround, lineNumberAt } from "../scan.js";

export function runIsThisAiSlop(text: string): Issue[] {
  const report = analyze(text);
  return report.findings.map((finding) => {
    const issue: Issue = {
      rule: `slop-${finding.category}`,
      engine: "is-this-ai-slop",
      category: "ai",
      severity: finding.weight >= 4 ? "warn" : "info",
      message: finding.note,
      line: lineNumberAt(text, finding.start),
      column: columnAt(text, finding.start),
      excerpt: excerptAround(text, finding.start),
      match: finding.match,
    };
    return issue;
  });
}
