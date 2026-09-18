import { describe, expect, it } from "vitest";
import { checkText, defineConfig, validateUserConfig } from "../src/index.js";

const extraEnginesOff = {
  writeGood: false,
  retext: false,
  isThisAiSlop: false,
  veldica: false,
  cleanWriting: false,
  aiSlopLinter: false,
  slopDetector: false,
  proseSlop: false,
  vale: false,
} as const;

describe("checkText", () => {
  it("flags high-signal AI tells in plain text", () => {
    const report = checkText(
      "In today's fast-paced world, we should delve into a rich tapestry of ideas. It's not just a tool, it's a game-changer.",
      {
        format: "plain",
        config: {
          failOn: "info",
          checks: { seo: false },
          engines: extraEnginesOff,
        },
      },
    );

    const rules = report.issues.map((issue) => issue.rule);
    expect(rules).toContain("in-todays-world");
    expect(rules).toContain("dive-deep");
    expect(rules).toContain("tapestry-journey");
    expect(rules).toContain("negative-parallelism");
    expect(report.score).toBeLessThan(100);
  });

  it("does not flag typography inside markdown code fences", () => {
    const report = checkText(
      [
        "# Title",
        "",
        "Prose without fancy dashes.",
        "",
        "```",
        "Wait—what?",
        "```",
      ].join("\n"),
      {
        format: "markdown",
        source: "note.md",
        config: { checks: { seo: false }, engines: extraEnginesOff },
      },
    );
    expect(report.issues.some((issue) => issue.rule === "ai-dashes")).toBe(
      false,
    );
  });

  it("skips fenced code in markdown", () => {
    const report = checkText(
      [
        "# Title",
        "",
        "```",
        "delve into the code",
        "```",
        "",
        "A short real sentence about Postgres.",
      ].join("\n"),
      {
        format: "markdown",
        source: "note.md",
        config: { engines: extraEnginesOff },
      },
    );

    expect(report.issues.some((issue) => issue.rule === "dive-deep")).toBe(
      false,
    );
  });

  it("reports missing markdown frontmatter as errors", () => {
    const report = checkText("# Hello\n\nSome body text that is long enough.", {
      format: "markdown",
      source: "post.md",
      config: { engines: extraEnginesOff },
    });
    const rules = report.issues.map((issue) => issue.rule);
    expect(rules).toContain("missing-title");
    expect(rules).toContain("missing-description");
  });

  it("applies safe auto-fixes for filler openers", () => {
    const report = checkText(
      "It's important to note that retries hide the bug.\n",
      {
        format: "plain",
        applyFixes: true,
        config: {
          checks: { seo: false, structure: false },
          engines: extraEnginesOff,
        },
      },
    );

    expect(report.fixedText).toContain("Retries hide the bug.");
    expect(report.fixedText).not.toMatch(/important to note/i);
  });

  it("flags slop-gate vocabulary from the mepritam pack", () => {
    const report = checkText("This nestled village is a treasure trove.", {
      format: "plain",
      config: { engines: extraEnginesOff },
    });
    const rules = report.issues.map((issue) => issue.rule);
    expect(rules).toContain("slop-nestled");
    expect(rules).toContain("slop-treasure-trove");
  });

  it("uses the grammar preset without AI vocabulary noise", () => {
    const report = checkText(
      "In today's fast-paced world we delve into the topic.",
      {
        format: "plain",
        config: { preset: "grammar", engines: { vale: false } },
      },
    );
    const rules = report.issues.map((issue) => issue.rule);
    expect(rules).not.toContain("dive-deep");
    expect(rules).not.toContain("in-todays-world");
  });

  it("does not set fixedText when nothing changes", () => {
    const report = checkText("Retries hide the bug.\n", {
      format: "plain",
      applyFixes: true,
      config: { engines: extraEnginesOff },
    });
    expect(report.fixedText).toBeUndefined();
  });

  it("turns off slop-gate punctuation except on the strict preset", () => {
    const loose = checkText("Wait—just checking.", {
      format: "plain",
      config: {
        checks: { typography: false },
        engines: extraEnginesOff,
      },
    });
    const strict = checkText("Wait—just checking.", {
      format: "plain",
      config: {
        preset: "strict",
        checks: { typography: false },
        engines: extraEnginesOff,
      },
    });
    expect(loose.issues.some((issue) => issue.rule.startsWith("slop-em"))).toBe(
      false,
    );
    expect(strict.issues.some((issue) => issue.rule.includes("slop-"))).toBe(
      true,
    );
  });

  it("runs the extra in-process engines by default", () => {
    const report = checkText(
      "In today's fast-paced world, we should delve into a robust tapestry of ideas.",
      { format: "plain", config: { engines: { vale: false } } },
    );
    expect(report.enginesRun).toEqual(
      expect.arrayContaining([
        "polish",
        "slop-gate",
        "write-good",
        "retext",
        "is-this-ai-slop",
        "veldica",
        "clean-writing",
        "ai-slop-linter",
        "slop-detector",
        "prose-slop",
      ]),
    );
    expect(
      report.issues.some((issue) => issue.engine === "is-this-ai-slop"),
    ).toBe(true);
  });
});

describe("config validation", () => {
  it("rejects unknown keys and bad enums", () => {
    const { errors } = validateUserConfig({
      preset: "nope",
      extra: true,
      minScore: 200,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((error) => error.includes("preset"))).toBe(true);
    expect(errors.some((error) => error.includes("Unknown config key"))).toBe(
      true,
    );
  });

  it("rejects unknown engine keys", () => {
    const { errors } = validateUserConfig({
      engines: { nope: true },
    });
    expect(errors.some((error) => error.includes("Unknown engines key"))).toBe(
      true,
    );
  });

  it("defineConfig throws on invalid input", () => {
    expect(() => defineConfig({ failOn: "fatal" as never })).toThrow(
      /Invalid ai-text-check config/,
    );
  });

  it("defineConfig accepts a valid config", () => {
    const config = defineConfig({
      preset: "ai",
      failOn: "error",
      ignoreRules: ["leverage-utilize"],
      engines: { vale: false, writeGood: false },
    });
    expect(config.preset).toBe("ai");
  });
});
