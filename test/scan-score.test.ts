import { describe, expect, it } from "vitest";
import {
  hasFailingIssue,
  scoreFromIssues,
  SEVERITY_RANK,
} from "../src/index.js";
import {
  columnAt,
  countSyllables,
  countWords,
  excerptAround,
  fleschReadingEase,
  isInsideCodeBlock,
  isInsideFrontmatter,
  isInsideHtmlBlock,
  isInsideInlineCode,
  isMarkdownTableLine,
  isMarkdownTableParagraph,
  looksLikeMarkdown,
  resolveFormat,
  shouldScanAt,
  splitParagraphs,
  splitSentences,
} from "../src/scan.js";
import type { Issue } from "../src/types.js";
import { resolveConfig } from "../src/config.js";

const issue = (
  severity: Issue["severity"],
  extra: Partial<Issue> = {},
): Issue => ({
  rule: "demo",
  category: "ai",
  severity,
  message: "demo",
  ...extra,
});

describe("score", () => {
  it("subtracts by severity and clamps at zero", () => {
    expect(scoreFromIssues([])).toBe(100);
    expect(scoreFromIssues([issue("info")])).toBe(97);
    expect(scoreFromIssues([issue("warn")])).toBe(92);
    expect(scoreFromIssues([issue("error")])).toBe(85);
    expect(
      scoreFromIssues(Array.from({ length: 20 }, () => issue("error"))),
    ).toBe(0);
  });

  it("ranks failing issues from the threshold", () => {
    expect(SEVERITY_RANK.warn).toBe(2);
    expect(hasFailingIssue([issue("info")], "warn")).toBe(false);
    expect(hasFailingIssue([issue("warn")], "warn")).toBe(true);
    expect(hasFailingIssue([issue("error")], "error")).toBe(true);
    expect(hasFailingIssue([issue("warn")], "error")).toBe(false);
  });
});

describe("scan", () => {
  it("detects markdown shape and file extensions", () => {
    expect(looksLikeMarkdown("# Title\n\nA paragraph.")).toBe(true);
    expect(looksLikeMarkdown("just words")).toBe(false);
    expect(resolveFormat("x", "auto", "note.md")).toBe("markdown");
    expect(resolveFormat("x", "auto", "note.mdx")).toBe("markdown");
    expect(resolveFormat("x", "auto", "note.txt")).toBe("plain");
    expect(resolveFormat("# Title", "auto")).toBe("markdown");
    expect(resolveFormat("hello", "auto")).toBe("plain");
    expect(resolveFormat("# Title", "plain")).toBe("plain");
  });

  it("knows code, frontmatter, html, tables, and inline code", () => {
    const fenced = "before\n```\nsecret\n```\nafter";
    expect(isInsideCodeBlock(fenced, fenced.indexOf("secret"))).toBe(true);
    expect(isInsideCodeBlock(fenced, 0)).toBe(false);

    const md = "---\ntitle: Hi\n---\nbody";
    expect(isInsideFrontmatter(md, 8)).toBe(true);
    expect(isInsideFrontmatter(md, md.length - 1)).toBe(false);
    expect(isInsideFrontmatter("nope", 0)).toBe(false);

    const html = "<div>inside</div> after";
    expect(isInsideHtmlBlock(html, html.indexOf("inside"))).toBe(true);
    expect(isInsideHtmlBlock(html, html.indexOf("after"))).toBe(false);

    expect(isInsideInlineCode("use `code` here", 6)).toBe(true);
    expect(isInsideInlineCode("use `code` here", 0)).toBe(false);
    expect(isMarkdownTableLine("| a | b |")).toBe(true);
    expect(isMarkdownTableLine("| --- |")).toBe(true);
    expect(isMarkdownTableLine("plain")).toBe(false);
    expect(isMarkdownTableParagraph("| a | b |\n| c | d |")).toBe(true);
    expect(isMarkdownTableParagraph("not a table")).toBe(false);
  });

  it("honors markdown skip flags", () => {
    const markdown = resolveConfig({}).markdown;
    const table = "| delve |\n| --- |";
    expect(
      shouldScanAt(table, table.indexOf("delve"), markdown, "markdown"),
    ).toBe(false);
    expect(shouldScanAt("delve", 0, markdown, "plain")).toBe(true);
  });

  it("computes positions, excerpts, and readability stats", () => {
    const text = "one\ntwo three";
    expect(columnAt(text, 5)).toBe(2);
    expect(excerptAround(text, 5, 2)).toContain("wo");
    expect(countWords("hello `code` world")).toBe(2);
    expect(splitSentences("Hello world. This is fine.")).toHaveLength(2);
    expect(splitParagraphs("a\n\nb")).toEqual(["a", "b"]);
    expect(countSyllables("a")).toBe(1);
    expect(countSyllables("testing")).toBeGreaterThan(1);
    expect(fleschReadingEase(0, 0, "")).toBe(0);
    expect(
      fleschReadingEase(10, 2, "This is a simple test of reading ease."),
    ).toBeGreaterThan(0);
  });
});
