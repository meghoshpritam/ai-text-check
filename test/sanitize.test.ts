import { describe, expect, it } from "vitest";
import {
  countSpecialChars,
  sanitizeMarkdown,
  sanitizeText,
} from "../src/index.js";

describe("sanitizeText", () => {
  it("normalizes dashes, quotes, ellipses, and invisible chars", () => {
    const input = "Wait—what? “Hello” …\u200Bworld";
    const output = sanitizeText(input);
    expect(output).toBe('Wait - what? "Hello" ...world');
    expect(output).not.toContain("\u200B");
  });

  it("keeps numeric ranges as hyphens", () => {
    expect(sanitizeText("2020–2024")).toBe("2020-2024");
  });

  it("counts replacements", () => {
    const stats = countSpecialChars("one—two “quote” …");
    expect(stats.dashes).toBeGreaterThan(0);
    expect(stats.smartQuotes).toBeGreaterThan(0);
    expect(stats.ellipses).toBeGreaterThan(0);
    expect(stats.total).toBeGreaterThan(0);
  });

  it("can disable individual replacements", () => {
    const input = "Wait—what?";
    expect(sanitizeText(input, { dashes: false })).toContain("—");
  });

  it("rewrites line-start bullets when enabled", () => {
    expect(sanitizeText("• item", { lineStartBullets: true })).toBe("- item");
  });

  it("normalizes line-start and line-end dashes", () => {
    expect(sanitizeText("— started")).toMatch(/^- /);
    expect(sanitizeText("ended —")).toMatch(/ -$/);
  });
});

describe("sanitizeMarkdown", () => {
  it("leaves fenced and inline code unchanged", () => {
    const input = [
      "Use `em—dash` in code.",
      "",
      "```ts",
      "const x = 'em—dash';",
      "```",
    ].join("\n");
    const output = sanitizeMarkdown(input);
    expect(output).toContain("`em—dash`");
    expect(output).toContain("const x = 'em—dash';");
  });
});
