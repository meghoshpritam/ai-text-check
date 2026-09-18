import { describe, expect, it } from "vitest";
import {
  defineConfig,
  resolveConfig,
  validateUserConfig,
} from "../src/index.js";
import { isStrictPreset } from "../src/config.js";

describe("resolveConfig", () => {
  it("fills defaults for the default preset", () => {
    const config = resolveConfig();
    expect(config.preset).toBe("default");
    expect(config.checks.ai).toBe(true);
    expect(config.engines.vale).toBe(true);
    expect(config.engines.writeGood).toBe(true);
    expect(config.failOn).toBe("warn");
    expect(config.ignoreEmojis).toBe(false);
    expect(config.extensions).toContain(".md");
    expect(config.seo.titleMin).toBe(20);
    expect(config.readability.longSentenceWords).toBe(35);
  });

  it("adds ai-emojis to ignoreRules when ignoreEmojis is set", () => {
    const config = resolveConfig({ ignoreEmojis: true });
    expect(config.ignoreEmojis).toBe(true);
    expect(config.ignoreRules).toContain("ai-emojis");
  });

  it("normalizes extensions without a leading dot", () => {
    const config = resolveConfig({ extensions: ["MDX", "txt"] });
    expect(config.extensions).toEqual([".mdx", ".txt"]);
  });

  it("turns grammar engines off on the ai preset", () => {
    const config = resolveConfig({ preset: "ai" });
    expect(config.checks.ai).toBe(true);
    expect(config.checks.grammar).toBe(false);
    expect(config.engines.writeGood).toBe(false);
    expect(config.engines.retext).toBe(false);
    expect(config.engines.isThisAiSlop).toBe(true);
    expect(config.engines.vale).toBe(true);
  });

  it("turns AI engines off on the grammar preset", () => {
    const config = resolveConfig({ preset: "grammar" });
    expect(config.checks.ai).toBe(false);
    expect(config.engines.slopGate).toBe(false);
    expect(config.engines.isThisAiSlop).toBe(false);
    expect(config.engines.veldica).toBe(false);
    expect(config.engines.writeGood).toBe(true);
    expect(config.engines.retext).toBe(true);
  });

  it("lets user engine flags override a preset", () => {
    const config = resolveConfig({
      preset: "grammar",
      engines: { vale: false, writeGood: false },
    });
    expect(config.engines.vale).toBe(false);
    expect(config.engines.writeGood).toBe(false);
    expect(config.engines.retext).toBe(true);
  });

  it("marks the strict preset", () => {
    const config = resolveConfig({ preset: "strict" });
    expect(isStrictPreset(config)).toBe(true);
    expect(isStrictPreset(resolveConfig())).toBe(false);
  });
});

describe("validateUserConfig", () => {
  it("accepts null and undefined as empty config", () => {
    expect(validateUserConfig(undefined).config).toEqual({});
    expect(validateUserConfig(null).config).toEqual({});
  });

  it("rejects a non-object root", () => {
    expect(validateUserConfig("nope").errors[0]).toMatch(/must be an object/);
  });

  it("validates nested objects and enums", () => {
    const { errors, config } = validateUserConfig({
      preset: "strict",
      format: "markdown",
      failOn: "info",
      minScore: 70,
      ignoreRules: ["dive-deep"],
      ignoreEmojis: true,
      include: ["docs"],
      exclude: ["tmp"],
      extensions: [".md"],
      checks: { ai: true, grammar: false },
      engines: { vale: false, polish: true },
      markdown: {
        skipCode: false,
        skipFrontmatter: true,
        skipHtml: true,
        skipTables: false,
      },
      seo: {
        titleMin: 10,
        titleMax: 80,
        descriptionMin: 40,
        descriptionMax: 200,
      },
      readability: {
        avgSentenceWarn: 20,
        longSentenceWords: 40,
        longParagraphWords: 90,
        passiveRatio: 0.4,
      },
    });
    expect(errors).toEqual([]);
    expect(config.preset).toBe("strict");
    expect(config.ignoreEmojis).toBe(true);
    expect(config.engines?.vale).toBe(false);
    expect(config.seo?.titleMin).toBe(10);
  });

  it("collects type errors for bad nested values", () => {
    const { errors } = validateUserConfig({
      checks: true,
      engines: [],
      format: "html",
      failOn: "fatal",
      minScore: 101,
      ignoreRules: "dive-deep",
      include: [1],
      exclude: "tmp",
      extensions: false,
      markdown: "yes",
      seo: "yes",
      readability: "yes",
    });
    expect(errors.length).toBeGreaterThan(5);
  });

  it("rejects unknown check keys and non-boolean check values", () => {
    const { errors } = validateUserConfig({
      checks: { ai: "yes", extra: true },
      engines: { vale: "yes" },
    });
    expect(errors.some((error) => error.includes("Unknown checks key"))).toBe(
      true,
    );
    expect(errors.some((error) => error.includes("checks.ai"))).toBe(true);
    expect(errors.some((error) => error.includes("engines.vale"))).toBe(true);
  });

  it("rejects non-finite numbers", () => {
    const { errors } = validateUserConfig({
      minScore: Number.NaN,
      seo: { titleMin: Number.POSITIVE_INFINITY },
    });
    expect(errors.some((error) => error.includes("minScore"))).toBe(true);
    expect(errors.some((error) => error.includes("seo.titleMin"))).toBe(true);
  });

  it("defineConfig returns the same object when valid", () => {
    const input = { preset: "default" as const, minScore: 50 };
    expect(defineConfig(input)).toEqual(input);
  });
});
