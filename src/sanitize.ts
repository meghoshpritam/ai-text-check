import type { ReplacementStats, SanitizeOptions } from "./types.js";
import { splitByCodeFences } from "./scan.js";

export const INVISIBLE_CHARS_REGEX =
  /[\u200B-\u200D\u2060\uFEFF\u00AD\u200E\u200F]/g;
export const UNICODE_SPACES_REGEX = /[\u00A0\u202F\u2000-\u200A\u205F\u3000]/g;
export const ELLIPSIS_REGEX = /\u2026/g;
export const DOUBLE_QUOTES_REGEX =
  /[\u201C\u201D\u201E\u201F\u00AB\u00BB\u2033]/g;
export const SINGLE_QUOTES_REGEX = /[\u2018\u2019\u201A\u201B\u2032]/g;
export const DASH_RANGE_REGEX = /(\d)[—–―‒](\d)/g;
export const DASH_LINE_START_REGEX = /^([ \t]*)[—–―‒][ \t]*/gm;
export const DASH_LINE_END_REGEX = /[ \t]*[—–―‒][ \t]*$/gm;
export const DASH_GENERAL_REGEX = /[ \t]*[—–―‒][ \t]*/g;
export const DASH_REMAINING_REGEX = /[—–―‒]/g;
export const LINE_START_BULLETS_REGEX = /^([ \t]*)•[ \t]*/gm;

function emptyStats(): ReplacementStats {
  return {
    dashes: 0,
    smartQuotes: 0,
    ellipses: 0,
    invisibleChars: 0,
    spaces: 0,
    lineStartBullets: 0,
    total: 0,
  };
}

export function sanitizeText(
  text: string,
  options: SanitizeOptions = {},
): string {
  const {
    dashes = true,
    smartQuotes = true,
    ellipses = true,
    invisibleChars = true,
    spaces = true,
    lineStartBullets = false,
  } = options;

  let result = text;

  if (invisibleChars) {
    result = result.replace(INVISIBLE_CHARS_REGEX, "");
  }
  if (spaces) {
    result = result.replace(UNICODE_SPACES_REGEX, " ");
  }
  if (ellipses) {
    result = result.replace(ELLIPSIS_REGEX, "...");
  }
  if (smartQuotes) {
    result = result.replace(DOUBLE_QUOTES_REGEX, '"');
    result = result.replace(SINGLE_QUOTES_REGEX, "'");
  }
  if (dashes) {
    result = result.replace(DASH_RANGE_REGEX, "$1-$2");
    result = result.replace(DASH_LINE_START_REGEX, "$1- ");
    result = result.replace(DASH_LINE_END_REGEX, " -");
    result = result.replace(DASH_GENERAL_REGEX, " - ");
    result = result.replace(DASH_REMAINING_REGEX, "-");
  }
  if (lineStartBullets) {
    result = result.replace(LINE_START_BULLETS_REGEX, "$1- ");
  }

  return result;
}

export function countSpecialChars(text: string): ReplacementStats {
  const stats = emptyStats();
  stats.dashes =
    (text.match(DASH_RANGE_REGEX) || []).length +
    (text.match(DASH_GENERAL_REGEX) || []).length +
    (text.match(DASH_REMAINING_REGEX) || []).length;
  stats.smartQuotes =
    (text.match(DOUBLE_QUOTES_REGEX) || []).length +
    (text.match(SINGLE_QUOTES_REGEX) || []).length;
  stats.ellipses = (text.match(ELLIPSIS_REGEX) || []).length;
  stats.invisibleChars = (text.match(INVISIBLE_CHARS_REGEX) || []).length;
  stats.spaces = (text.match(UNICODE_SPACES_REGEX) || []).length;
  stats.lineStartBullets = (text.match(LINE_START_BULLETS_REGEX) || []).length;
  stats.total =
    stats.dashes +
    stats.smartQuotes +
    stats.ellipses +
    stats.invisibleChars +
    stats.spaces;
  return stats;
}

function sanitizeProsePreservingInlineCode(
  prose: string,
  options: SanitizeOptions,
): string {
  return prose
    .split(/(`[^`\n]+`)/g)
    .map((segment) => {
      if (segment.startsWith("`") && segment.endsWith("`")) {
        return segment;
      }
      return sanitizeText(segment, options);
    })
    .join("");
}

export function sanitizeMarkdown(
  markdown: string,
  options: SanitizeOptions = {},
): string {
  return splitByCodeFences(markdown)
    .map((segment) =>
      segment.isCode
        ? segment.text
        : sanitizeProsePreservingInlineCode(segment.text, options),
    )
    .join("");
}
