import { marked, Renderer, type Tokens } from "marked";
import { applyAutoFixes } from "./fix.js";
import { SLOP_PACKS } from "./rules/data/slop-gate.js";
import { sanitizeText } from "./sanitize.js";

type SlopRule = {
  id: string;
  match: string;
  hint: string;
};

type SlopPack = {
  id: string;
  flags?: string;
  rules: SlopRule[];
};

function replacementFromHint(hint: string, ruleId: string): string | null {
  if (ruleId === "em-dash") return "-";

  const useQuoted = hint.match(/^Use '([^']+)'(?:\s+or\b|\s*,|\.)/);
  if (useQuoted?.[1]) return useQuoted[1];

  if (/^(Delete it|Cut it|Drop it|Often deletable)\b/i.test(hint)) {
    return "";
  }

  return null;
}

function applySlopGatePacks(text: string, packs: SlopPack[]): string {
  let next = text;

  for (const pack of packs) {
    const flagSet = new Set((pack.flags ?? "").split("").filter(Boolean));
    flagSet.add("g");
    const uniqueFlags = [...flagSet].join("");

    for (const rule of pack.rules) {
      const replacement = replacementFromHint(rule.hint, rule.id);
      if (replacement === null) continue;

      const pattern = new RegExp(rule.match, uniqueFlags);
      next = next.replace(pattern, () => replacement);
    }
  }

  return next.replace(/\blook at into\b/gi, "look at");
}

function decodeBasicEntities(text: string): string {
  return text
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function markdownToPlainText(source: string): string {
  const renderer = new Renderer();

  renderer.heading = function (token: Tokens.Heading) {
    return `${this.parser.parseInline(token.tokens)}\n\n`;
  };
  renderer.paragraph = function (token: Tokens.Paragraph) {
    return `${this.parser.parseInline(token.tokens)}\n\n`;
  };
  renderer.strong = ({ text }: Tokens.Strong) => text;
  renderer.em = ({ text }: Tokens.Em) => text;
  renderer.del = ({ text }: Tokens.Del) => text;
  renderer.codespan = ({ text }: Tokens.Codespan) => text;
  renderer.code = ({ text }: Tokens.Code) => `${text}\n\n`;
  renderer.blockquote = function (token: Tokens.Blockquote) {
    return this.parser.parse(token.tokens);
  };
  renderer.list = function (token: Tokens.List) {
    let body = "";
    for (const item of token.items) {
      body += this.listitem(item);
    }
    return `${body}\n`;
  };
  renderer.listitem = function (item: Tokens.ListItem) {
    return `${this.parser.parse(item.tokens).trimEnd()}\n`;
  };
  renderer.link = ({ href, text }: Tokens.Link) =>
    text && text !== href ? `${text} (${href})` : href;
  renderer.image = () => "";
  renderer.br = () => "\n";
  renderer.hr = () => "\n\n";
  renderer.html = () => "";
  renderer.checkbox = () => "";

  const parsed = marked.parse(source, {
    renderer,
    async: false,
    gfm: true,
    breaks: true,
  });

  return decodeBasicEntities(String(parsed))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizePlainText(text: string): string {
  return sanitizeText(text)
    .trim()
    .replace(/\*\*/g, "")
    .replace(/\[[^\]]*]\(([^)]+)\)/g, "$1")
    .trim();
}

/**
 * Personalize pasted text using the mepritam pipeline:
 * sanitize special chars, Markdown to plain text, slop-gate packs, then
 * content-polish auto-fixes.
 */
export function personalizeText(raw: string): string {
  const sanitized = sanitizePlainText(raw);
  const plain = markdownToPlainText(sanitized);
  const deSlopped = applySlopGatePacks(plain, [
    SLOP_PACKS.vocabulary,
    SLOP_PACKS.punctuation,
  ]);
  return sanitizePlainText(applyAutoFixes(deSlopped));
}
