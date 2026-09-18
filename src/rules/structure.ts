import type { Issue } from "../types.js";
import { countWords, splitParagraphs } from "../scan.js";

const MORALIZING_CONCLUSION_OPENERS =
  /^(?:ultimately|in the end|at its core|fundamentally|when all is said and done|the key takeaway is|the bottom line is|what (?:this|it) (?:really )?comes down to is)\b/i;

export function analyzeStructure(body: string): Issue[] {
  const issues: Issue[] = [];
  const lines = body.split("\n");
  const headings: { line: number; text: string }[] = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const text = lines[i] ?? "";
    if (/^\s*```/.test(text)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^#{1,6}\s/.test(text)) {
      headings.push({ line: i + 1, text });
    }
  }

  if (headings.length === 0 && countWords(body) > 400) {
    issues.push({
      rule: "missing-headings",
      category: "structure",
      severity: "warn",
      message:
        "Long article without headings. Add sections so readers (and search) can scan the page.",
    });
  }

  let prevLevel = 0;
  for (const heading of headings) {
    const level = heading.text.match(/^#+/)?.[0]?.length ?? 0;
    if (prevLevel > 0 && level > prevLevel + 1) {
      issues.push({
        rule: "heading-skip",
        category: "structure",
        severity: "warn",
        message:
          "Heading level jumps (e.g. H2 to H4). Keep hierarchy sequential.",
        line: heading.line,
        excerpt: heading.text,
      });
    }
    prevLevel = level;

    const title = heading.text.replace(/^#+\s*/, "").trim();
    if (/^\d+\.\s/.test(title) && countWords(body) < 1200) {
      issues.push({
        rule: "numbered-sections",
        category: "structure",
        severity: "info",
        message:
          "Numbered section titles can feel like generated listicles. Use descriptive headings unless the sequence matters.",
        line: heading.line,
        excerpt: title,
      });
    }
  }

  const h1Count = headings.filter(({ text }) => /^#\s/.test(text)).length;
  if (h1Count > 1) {
    issues.push({
      rule: "multiple-h1",
      category: "structure",
      severity: "warn",
      message: `${h1Count} H1 headings found. One page title is usually enough.`,
    });
  }

  const paragraphs = splitParagraphs(body);
  const lastParagraph = paragraphs[paragraphs.length - 1]?.trim();
  if (
    lastParagraph &&
    paragraphs.length >= 3 &&
    MORALIZING_CONCLUSION_OPENERS.test(lastParagraph)
  ) {
    issues.push({
      rule: "moralizing-conclusion",
      category: "structure",
      severity: "info",
      message:
        "Closing paragraph opens with a generic moralizing wrap-up. End on a concrete detail or result instead.",
      excerpt: lastParagraph.slice(0, 100),
    });
  }

  return issues;
}
