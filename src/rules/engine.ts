import type {
  Category,
  ClauseReplacer,
  Issue,
  MarkdownConfig,
  PatternRule,
  TextFormat,
} from "../types.js";
import {
  columnAt,
  countWords,
  excerptAround,
  lineNumberAt,
  shouldScanAt,
} from "../scan.js";

export function replaceWithRule(
  text: string,
  pattern: RegExp,
  replacement: string | ClauseReplacer,
): string {
  return text.replace(pattern, replacement as string);
}

export function runPatternRules(
  body: string,
  rules: PatternRule[],
  options: {
    format: Exclude<TextFormat, "auto">;
    markdown: Required<MarkdownConfig>;
    ignoreRules: Set<string>;
    extraCategory?: Category;
  },
): Issue[] {
  const issues: Issue[] = [];
  const words = countWords(body);

  for (const rule of rules) {
    if (options.ignoreRules.has(rule.id)) continue;

    const matches = [...body.matchAll(rule.pattern)];
    if (matches.length === 0) continue;

    const visible = matches.filter(
      (match) =>
        match.index !== undefined &&
        shouldScanAt(body, match.index, options.markdown, options.format),
    );
    if (visible.length === 0) continue;

    const minCount =
      typeof rule.minCount === "function"
        ? rule.minCount({ words })
        : (rule.minCount ?? 1);
    if (visible.length < minCount) continue;

    const first = visible[0];
    if (!first || first.index === undefined) continue;
    const count = visible.length;

    const issue: Issue = {
      rule: rule.id,
      category: options.extraCategory ?? rule.category,
      severity: rule.severity ?? "warn",
      message:
        count > 1 ? `${rule.message} (${count} occurrences)` : rule.message,
      line: lineNumberAt(body, first.index),
      column: columnAt(body, first.index),
      excerpt: excerptAround(body, first.index),
      match: first[0],
    };
    if (rule.suggestion) issue.suggestion = rule.suggestion;
    issues.push(issue);
  }

  return issues;
}

const LIST_MARKER_PREFIX = /^(\s*)(?:[*+-]|\d+[.)])( {1,})(?=\S)/;

export function collapseExtraSpaces(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (/^\|/.test(line.trim()) || /^\|?[\s:|-]+$/.test(line.trim())) {
        return line;
      }
      const markerMatch = line.match(LIST_MARKER_PREFIX);
      const prefixLength = markerMatch ? markerMatch[0].length : 0;
      const prefix = line.slice(0, prefixLength);
      const rest = line.slice(prefixLength);
      const collapsedRest = rest.replace(/[^\s] {2,}[^\s]/g, (match) =>
        match.replace(/ {2,}/g, " "),
      );
      return prefix + collapsedRest;
    })
    .join("\n");
}
