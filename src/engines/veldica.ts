import { inventoryMarkers } from "@veldica/prose-linter";
import type { Issue, Severity } from "../types.js";
import { columnAt, excerptAround } from "../scan.js";

function toSeverity(value: string): Severity {
  if (value === "high") return "warn";
  return "info";
}

export function runVeldica(text: string): Issue[] {
  const analysis = inventoryMarkers(text, {
    track_ai_patterns: true,
    include_document_signals: true,
  });

  return analysis.matches.map((match) => {
    const offset = match.offset ?? 0;
    const issue: Issue = {
      rule: `veldica-${match.category || "marker"}`,
      engine: "veldica",
      category: "ai",
      severity: toSeverity(match.severity),
      message: `AI-style marker (${match.category}): “${match.matched_text}”`,
      excerpt: excerptAround(text, offset),
      match: match.matched_text,
    };
    if (match.line != null) issue.line = match.line;
    if (match.column != null) issue.column = match.column;
    if (match.line == null && match.offset != null) {
      issue.column = columnAt(text, match.offset);
    }
    return issue;
  });
}
