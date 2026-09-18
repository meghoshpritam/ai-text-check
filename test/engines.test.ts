import { describe, expect, it } from "vitest";
import { checkText } from "../src/index.js";
import { runAiSlopLinter } from "../src/engines/ai-slop-linter.js";
import { runCleanWriting } from "../src/engines/clean-writing.js";
import { runIsThisAiSlop } from "../src/engines/is-this-ai-slop.js";
import { runProseSlop } from "../src/engines/prose-slop.js";
import { runRetext } from "../src/engines/retext.js";
import { runSlopDetector } from "../src/engines/slop-detector.js";
import { tagEngine, uniqueEngines } from "../src/engines/tag.js";
import { valeIssuesForFile } from "../src/engines/vale.js";
import { runVeldica } from "../src/engines/veldica.js";
import { runWriteGood } from "../src/engines/write-good.js";
import { onlyEngines, PASSIVE_TEXT, SLOP_TEXT } from "./helpers.js";

describe("write-good engine", () => {
  it("flags weasel words and wordy phrases", () => {
    const issues = runWriteGood(PASSIVE_TEXT);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.engine === "write-good")).toBe(true);
    expect(issues.every((issue) => issue.category === "grammar")).toBe(true);
  });

  it("runs through checkText when enabled", () => {
    const report = checkText(PASSIVE_TEXT, {
      format: "plain",
      config: { engines: onlyEngines({ writeGood: true }) },
    });
    expect(report.enginesRun).toEqual(["write-good"]);
    expect(report.issues.some((issue) => issue.engine === "write-good")).toBe(
      true,
    );
  });
});

describe("retext engine", () => {
  it("flags passive voice and repeated words", () => {
    const issues = runRetext(
      "The letter was sent by Alice. The the packet arrived later.",
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.engine === "retext")).toBe(true);
    expect(issues.some((issue) => issue.rule.includes("retext-"))).toBe(true);
  });

  it("runs through checkText when grammar is on", () => {
    const report = checkText(
      "The letter was sent by Alice. The the packet arrived later.",
      { format: "plain", config: { engines: onlyEngines({ retext: true }) } },
    );
    expect(report.enginesRun).toContain("retext");
  });
});

describe("is-this-ai-slop engine", () => {
  it("flags cliches and antithesis", () => {
    const issues = runIsThisAiSlop(SLOP_TEXT);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.engine === "is-this-ai-slop")).toBe(
      true,
    );
    expect(issues.every((issue) => issue.category === "ai")).toBe(true);
  });

  it("is skipped on the grammar preset", () => {
    const report = checkText(SLOP_TEXT, {
      format: "plain",
      config: {
        preset: "grammar",
        engines: onlyEngines({ isThisAiSlop: true }),
      },
    });
    expect(report.enginesRun).not.toContain("is-this-ai-slop");
  });
});

describe("veldica engine", () => {
  it("inventories AI-style markers", () => {
    const issues = runVeldica(
      "In this guide, we will explore the landscape. Let's dive into the details.",
    );
    expect(issues.every((issue) => issue.engine === "veldica")).toBe(true);
    expect(issues.every((issue) => issue.rule.startsWith("veldica-"))).toBe(
      true,
    );
  });
});

describe("clean-writing engine", () => {
  it("flags banned words and marketing adjectives", () => {
    const issues = runCleanWriting(
      "We leverage a robust solution in order to utilize the platform.",
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.engine === "clean-writing")).toBe(
      true,
    );
    expect(issues.every((issue) => issue.rule.startsWith("cws-"))).toBe(true);
  });

  it("does not treat contractions as errors", () => {
    const issues = runCleanWriting("I don't think we'll ship Friday.");
    expect(issues.some((issue) => issue.rule === "cws-contraction")).toBe(
      false,
    );
  });
});

describe("ai-slop-linter engine", () => {
  it("flags Wikipedia-sourced AI writing tells", () => {
    const issues = runAiSlopLinter(
      "It's not just a product — it's a comprehensive solution that will delve into the details.",
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.engine === "ai-slop-linter")).toBe(
      true,
    );
    expect(issues.every((issue) => issue.rule.startsWith("asl-"))).toBe(true);
  });
});

describe("slop-detector engine", () => {
  it("scores EQBench slop signals", () => {
    const issues = runSlopDetector(SLOP_TEXT);
    expect(issues.every((issue) => issue.engine === "slop-detector")).toBe(
      true,
    );
    expect(issues.some((issue) => issue.rule.startsWith("eqbench-"))).toBe(
      true,
    );
  });
});

describe("prose-slop engine", () => {
  it("flags vocabulary and character tells", () => {
    const issues = runProseSlop(
      "In today's world we leverage a seamless tapestry of ideas — and delve deeper.",
    );
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.engine === "prose-slop")).toBe(true);
    expect(issues.every((issue) => issue.rule.startsWith("prose-"))).toBe(true);
  });
});

describe("engine helpers", () => {
  it("tags issues with an engine name", () => {
    const tagged = tagEngine(
      [
        {
          rule: "demo",
          category: "ai",
          severity: "warn",
          message: "demo",
        },
      ],
      "polish",
    );
    expect(tagged[0]?.engine).toBe("polish");
  });

  it("deduplicates engine names", () => {
    expect(uniqueEngines(["vale", "polish", "vale"])).toEqual([
      "vale",
      "polish",
    ]);
  });

  it("returns no Vale issues for an unknown file", () => {
    expect(valeIssuesForFile(new Map(), "missing.md")).toEqual([]);
  });
});
