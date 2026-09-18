import type { Issue } from "../types.js";
import { countSpecialChars } from "../sanitize.js";
import { splitByCodeFences } from "../scan.js";

function proseOnly(text: string): string {
  return splitByCodeFences(text)
    .filter((segment) => !segment.isCode)
    .map((segment) => segment.text.replace(/`[^`\n]+`/g, " "))
    .join("");
}

export function analyzeTypography(
  text: string,
  options: { skipCode?: boolean } = {},
): Issue[] {
  const scanned = options.skipCode ? proseOnly(text) : text;
  const counts = countSpecialChars(scanned);
  const issues: Issue[] = [];

  if (counts.dashes > 0) {
    issues.push({
      rule: "ai-dashes",
      category: "typography",
      severity: counts.dashes >= 3 ? "warn" : "info",
      message: `Found ${counts.dashes} em/en/figure dash(es). AI drafts overuse them.`,
      suggestion: "Use a comma, hyphen, colon, or split the sentence.",
    });
  }

  if (counts.smartQuotes > 0) {
    issues.push({
      rule: "smart-quotes",
      category: "typography",
      severity: "info",
      message: `Found ${counts.smartQuotes} curly/smart quote(s).`,
      suggestion:
        "Normalize to ASCII quotes unless the house style requires them.",
    });
  }

  if (counts.ellipses > 0) {
    issues.push({
      rule: "unicode-ellipsis",
      category: "typography",
      severity: "info",
      message: `Found ${counts.ellipses} unicode ellipsis character(s).`,
      suggestion: "Use three ASCII dots (...).",
    });
  }

  if (counts.invisibleChars > 0) {
    issues.push({
      rule: "invisible-chars",
      category: "typography",
      severity: "warn",
      message: `Found ${counts.invisibleChars} invisible/zero-width character(s). These often leak from AI tools.`,
      suggestion: "Strip zero-width spaces, joiners, and BOM.",
    });
  }

  if (counts.spaces > 0) {
    issues.push({
      rule: "unicode-spaces",
      category: "typography",
      severity: "info",
      message: `Found ${counts.spaces} non-breaking or irregular unicode space(s).`,
      suggestion: "Normalize to standard ASCII spaces.",
    });
  }

  return issues;
}
