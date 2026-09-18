import { getAutoFixRules } from "./rules/index.js";
import { collapseExtraSpaces, replaceWithRule } from "./rules/engine.js";
import { splitByCodeFences } from "./scan.js";

function applyAutoFixesToProse(text: string): string {
  let next = text;

  for (const rule of getAutoFixRules()) {
    const replacement = rule.replacement;
    if (replacement === undefined) continue;
    if (rule.id === "double-space") {
      next = collapseExtraSpaces(next);
      continue;
    }
    next = replaceWithRule(next, rule.pattern, replacement);
  }

  return next;
}

export function applyAutoFixes(body: string): string {
  let next = splitByCodeFences(body)
    .map((segment) =>
      segment.isCode ? segment.text : applyAutoFixesToProse(segment.text),
    )
    .join("");

  next = next.replace(/\n{3,}/g, "\n\n");
  next = next.replace(/^\s+$/gm, "");
  next = next.replace(/[ \t]+,/g, ",");
  next = next.replace(/^\s*,\s*/gm, "");
  return next.trimEnd() + "\n";
}
