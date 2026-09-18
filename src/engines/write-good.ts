import { createRequire } from "node:module";
import type { Issue } from "../types.js";
import { columnAt, excerptAround, lineNumberAt } from "../scan.js";

const require = createRequire(import.meta.url);
const writeGood = require("write-good") as (
  text: string,
  options?: {
    so?: boolean;
    thereIs?: boolean;
    eprime?: boolean;
  },
) => { index: number; offset: number; reason: string }[];

export function runWriteGood(text: string): Issue[] {
  const suggestions = writeGood(text, {
    so: false,
    thereIs: false,
  });

  return suggestions.map((item) => {
    const issue: Issue = {
      rule: "write-good",
      engine: "write-good",
      category: "grammar",
      severity: "info",
      message: item.reason,
      line: lineNumberAt(text, item.index),
      column: columnAt(text, item.index),
      excerpt: excerptAround(text, item.index),
      match: text.slice(item.index, item.index + item.offset),
    };
    return issue;
  });
}
