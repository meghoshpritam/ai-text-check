import type { MarkdownConfig, TextFormat } from "./types.js";

const MARKDOWN_HINT =
  /(?:^---\r?\n[\s\S]*?\r?\n---\r?\n)|(?:^#{1,6}\s+\S)|(?:```)|(?:^\s*[-*+]\s+\S)|(?:\[[^\]]+\]\([^)]+\))/m;

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_HINT.test(text);
}

export function resolveFormat(
  text: string,
  format: TextFormat,
  filePath?: string,
): Exclude<TextFormat, "auto"> {
  if (format === "markdown" || format === "plain") return format;
  if (filePath) {
    const lower = filePath.toLowerCase();
    if (
      lower.endsWith(".md") ||
      lower.endsWith(".mdx") ||
      lower.endsWith(".markdown")
    ) {
      return "markdown";
    }
    if (lower.endsWith(".txt")) return "plain";
  }
  return looksLikeMarkdown(text) ? "markdown" : "plain";
}

export function isInsideCodeBlock(text: string, index: number): boolean {
  const before = text.slice(0, index);
  const fences = (before.match(/```/g) || []).length;
  return fences % 2 === 1;
}

export function isInsideFrontmatter(text: string, index: number): boolean {
  if (!text.startsWith("---")) return false;
  const end = text.indexOf("\n---", 3);
  return end !== -1 && index < end + 4;
}

export function isInsideHtmlBlock(text: string, index: number): boolean {
  const before = text.slice(0, index);
  const opens = (
    before.match(/<(?:div|header|section|article|table|ul|ol)\b/gi) || []
  ).length;
  const closes = (
    before.match(/<\/(?:div|header|section|article|table|ul|ol)>/gi) || []
  ).length;
  return opens > closes;
}

export function isInsideInlineCode(text: string, index: number): boolean {
  const lineStart = text.lastIndexOf("\n", index - 1) + 1;
  const lineEnd = text.indexOf("\n", index);
  const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
  const localIndex = index - lineStart;
  let ticks = 0;
  for (let i = 0; i < localIndex; i++) {
    if (line[i] === "`") ticks += 1;
  }
  return ticks % 2 === 1;
}

export function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index - 1) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end === -1 ? text.length : end);
}

export function isMarkdownTableLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/^\|.*\|$/.test(trimmed)) return true;
  if (/^\|?[\s:|-]+$/.test(trimmed) && trimmed.includes("-")) return true;
  return false;
}

export function isMarkdownTableParagraph(paragraph: string): boolean {
  const lines = paragraph
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
  return lines.length >= 2 && lines.every((item) => item.startsWith("|"));
}

export function shouldScanAt(
  body: string,
  index: number,
  markdown: Required<MarkdownConfig>,
  format: Exclude<TextFormat, "auto">,
): boolean {
  if (format !== "markdown") return true;
  if (markdown.skipCode && isInsideCodeBlock(body, index)) return false;
  if (markdown.skipCode && isInsideInlineCode(body, index)) return false;
  if (markdown.skipFrontmatter && isInsideFrontmatter(body, index)) {
    return false;
  }
  if (markdown.skipHtml && isInsideHtmlBlock(body, index)) return false;
  if (markdown.skipTables && isMarkdownTableLine(lineAt(body, index))) {
    return false;
  }
  return true;
}

export function lineNumberAt(text: string, index: number): number {
  return text.slice(0, index).split("\n").length;
}

export function columnAt(text: string, index: number): number {
  const start = text.lastIndexOf("\n", index - 1) + 1;
  return index - start + 1;
}

export function excerptAround(
  text: string,
  index: number,
  radius = 48,
): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function splitByCodeFences(
  body: string,
): { text: string; isCode: boolean }[] {
  return body
    .split(/(```[\s\S]*?```)/g)
    .map((text) => ({ text, isCode: text.startsWith("```") }));
}

export function stripForReadability(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ".\n\n")
    .replace(/`[^`]+`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+.+$/gm, ".")
    .replace(/^---+$/gm, ".")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^\|.*\|$/.test(trimmed)) return false;
      if (/^\|?[\s:|-]+$/.test(trimmed) && trimmed.includes("-")) return false;
      return true;
    })
    .join("\n");
}

export function splitSentences(text: string): string[] {
  return stripForReadability(text)
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 8);
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(
      (item) =>
        item.length > 0 &&
        !item.startsWith("```") &&
        !isMarkdownTableParagraph(item),
    );
}

export function countWords(text: string): number {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ")
    .replace(/[#>*_[\]()!-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!cleaned) return 0;
  if (cleaned.length <= 3) return 1;
  const groups = cleaned.replace(/e$/, "").match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups?.length ?? 1);
}

export function fleschReadingEase(
  words: number,
  sentences: number,
  text: string,
): number {
  if (words === 0 || sentences === 0) return 0;
  const syllables = text
    .split(/\s+/)
    .reduce((sum, word) => sum + countSyllables(word), 0);
  const score =
    206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.min(100, score));
}
