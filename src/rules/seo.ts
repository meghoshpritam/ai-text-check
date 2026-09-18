import type { Frontmatter } from "../markdown.js";
import type { Issue, ResolvedConfig } from "../types.js";

export function analyzeFrontmatter(
  data: Frontmatter,
  config: ResolvedConfig,
): Issue[] {
  const issues: Issue[] = [];
  const title = String(data.title ?? "").trim();
  const description = String(data.description ?? "").trim();
  const { titleMin, titleMax, descriptionMin, descriptionMax } = config.seo;

  if (!title) {
    issues.push({
      rule: "missing-title",
      category: "seo",
      severity: "error",
      message: "Frontmatter is missing a title.",
    });
  } else {
    if (title.length < titleMin) {
      issues.push({
        rule: "short-title",
        category: "seo",
        severity: "warn",
        message: `Title is ${title.length} chars. Aim for ${titleMin}-${titleMax} for search snippets.`,
      });
    }
    if (title.length > titleMax) {
      issues.push({
        rule: "long-title",
        category: "seo",
        severity: "warn",
        message: `Title is ${title.length} chars. It may truncate in search results.`,
      });
    }
  }

  if (!description) {
    issues.push({
      rule: "missing-description",
      category: "seo",
      severity: "error",
      message:
        "Missing meta description. Write one sentence that states the outcome, not a keyword list.",
    });
  } else {
    if (description.length < descriptionMin) {
      issues.push({
        rule: "short-description",
        category: "seo",
        severity: "warn",
        message: `Description is ${description.length} chars. Aim for ${descriptionMin}-${descriptionMax}.`,
      });
    }
    if (description.length > descriptionMax) {
      issues.push({
        rule: "long-description",
        category: "seo",
        severity: "warn",
        message: `Description is ${description.length} chars and may truncate in search results.`,
      });
    }
    if (
      /^(a |an |the )?(comprehensive|complete|ultimate|definitive)\b/i.test(
        description,
      )
    ) {
      issues.push({
        rule: "marketing-description",
        category: "seo",
        severity: "info",
        message:
          "Description opens with marketing language. Lead with what the reader gets done.",
      });
    }
  }

  if (!data.date && !data.publishDate) {
    issues.push({
      rule: "missing-date",
      category: "seo",
      severity: "info",
      message:
        "No publish date in frontmatter. Freshness signals help references rank.",
    });
  }

  return issues;
}
