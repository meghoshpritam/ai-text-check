import retextEnglish from "retext-english";
import retextPassive from "retext-passive";
import retextReadability from "retext-readability";
import retextRepeatedWords from "retext-repeated-words";
import retextSimplify from "retext-simplify";
import retextStringify from "retext-stringify";
import { unified } from "unified";
import type { Category, Issue, Severity } from "../types.js";
import { excerptAround } from "../scan.js";

function categoryForSource(source: string | null | undefined): Category {
  if (source === "retext-readability") return "readability";
  return "grammar";
}

function severityForSource(source: string | null | undefined): Severity {
  if (source === "retext-readability") return "warn";
  return "info";
}

export function runRetext(text: string): Issue[] {
  const file = unified()
    .use(retextEnglish)
    .use(retextPassive)
    .use(retextReadability, { age: 18 })
    .use(retextSimplify)
    .use(retextRepeatedWords)
    .use(retextStringify)
    .processSync(text);

  return file.messages.map((message) => {
    const startOffset =
      message.place && "start" in message.place
        ? (message.place.start.offset ?? 0)
        : 0;
    const issue: Issue = {
      rule: `retext-${message.ruleId ?? "message"}`,
      engine: "retext",
      category: categoryForSource(message.source),
      severity: severityForSource(message.source),
      message: message.reason ?? message.message,
      excerpt: excerptAround(text, startOffset),
    };
    if (message.line != null) issue.line = message.line;
    if (message.column != null) issue.column = message.column;
    if (message.actual) issue.match = String(message.actual);
    return issue;
  });
}
