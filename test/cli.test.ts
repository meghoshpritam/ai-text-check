import { afterEach, describe, expect, it, vi } from "vitest";
import { parseArgs, printHelp, toUserConfig } from "../src/cli/args.js";
import { initProject, packageVersion } from "../src/cli/init.js";
import { printReport, printSummary } from "../src/cli/print.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CheckReport, CheckSummary } from "../src/types.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("parseArgs", () => {
  it("parses init, help, and version commands", () => {
    expect(parseArgs(["init"]).command).toBe("init");
    expect(parseArgs(["help"]).command).toBe("help");
    expect(parseArgs(["version"]).command).toBe("version");
    expect(parseArgs(["--help"]).command).toBe("help");
    expect(parseArgs(["-h"]).command).toBe("help");
    expect(parseArgs(["--version"]).command).toBe("version");
    expect(parseArgs(["-v"]).command).toBe("version");
  });

  it("parses boolean and value flags", () => {
    const options = parseArgs([
      "--fix",
      "--sanitize",
      "--json",
      "--verbose",
      "--vale",
      "--slop",
      "--min-score",
      "70",
      "--fail-on",
      "info",
      "--preset",
      "strict",
      "--format",
      "plain",
      "--ignore-rule",
      "dive-deep",
      "--ignore-rule",
      "ai-dashes",
      "--config",
      "./ai-text-check.config.json",
      "docs",
      "--",
      "--minAlertLevel",
      "error",
    ]);
    expect(options.fix).toBe(true);
    expect(options.sanitize).toBe(true);
    expect(options.json).toBe(true);
    expect(options.verbose).toBe(true);
    expect(options.vale).toBe(true);
    expect(options.slop).toBe(true);
    expect(options.minScore).toBe(70);
    expect(options.failOn).toBe("info");
    expect(options.preset).toBe("strict");
    expect(options.format).toBe("plain");
    expect(options.ignoreRules).toEqual(["dive-deep", "ai-dashes"]);
    expect(options.configPath).toBe("./ai-text-check.config.json");
    expect(options.paths).toEqual(["docs"]);
    expect(options.valeArgs).toEqual(["--minAlertLevel", "error"]);
  });

  it("turns optional engines off", () => {
    const options = parseArgs([
      "--no-vale",
      "--no-slop",
      "--no-write-good",
      "--no-retext",
    ]);
    expect(options.vale).toBe(false);
    expect(options.slop).toBe(false);
    expect(options.writeGood).toBe(false);
    expect(options.retext).toBe(false);
    const config = toUserConfig(options);
    expect(config.engines).toEqual({
      vale: false,
      slopGate: false,
      isThisAiSlop: false,
      writeGood: false,
      retext: false,
    });
  });

  it("leaves engines unset when every CLI engine stays on", () => {
    expect(toUserConfig(parseArgs(["docs"])).engines).toBeUndefined();
  });

  it("rejects invalid values", () => {
    expect(() => parseArgs(["--min-score", "nope"])).toThrow(/number/);
    expect(() => parseArgs(["--fail-on", "fatal"])).toThrow(/fail-on/);
    expect(() => parseArgs(["--preset", "loose"])).toThrow(/preset/);
    expect(() => parseArgs(["--format", "html"])).toThrow(/format/);
    expect(() => parseArgs(["--ignore-rule"])).toThrow(/ignore-rule/);
    expect(() => parseArgs(["--config"])).toThrow(/config/);
  });
});

describe("printHelp and reports", () => {
  it("prints usage", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    printHelp();
    expect(log.mock.calls.join("\n")).toMatch(/ai-text-check/);
  });

  it("prints issues with engine-qualified rules", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const report: CheckReport = {
      source: "note.md",
      title: "note",
      format: "markdown",
      score: 80,
      enginesRun: ["polish"],
      stats: {
        words: 12,
        sentences: 1,
        paragraphs: 1,
        avgSentenceLength: 12,
        avgParagraphLength: 12,
        passiveVoiceHits: 0,
        aiPatternHits: 1,
        fleschReadingEase: 70,
        titleLength: 4,
        descriptionLength: 0,
      },
      issues: [
        {
          rule: "dive-deep",
          engine: "polish",
          category: "ai",
          severity: "warn",
          message: "Overused AI phrasing",
          line: 3,
          excerpt: "delve into",
        },
      ],
    };
    printReport(report, false);
    expect(log.mock.calls.join("\n")).toMatch(/polish\/dive-deep:3/);

    log.mockClear();
    printReport({ ...report, issues: [] }, true);
    expect(log.mock.calls.join("\n")).toMatch(/✓ note.md/);

    log.mockClear();
    printReport({ ...report, issues: [] }, false);
    expect(log).not.toHaveBeenCalled();
  });

  it("prints summary states", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const base: CheckSummary = {
      reports: [],
      filesChecked: 2,
      filesWithIssues: 0,
      filesFixed: 1,
      averageScore: 91.2,
      failed: false,
    };
    printSummary(base, true);
    expect(log.mock.calls.join("\n")).toMatch(/All content checks passed/);

    log.mockClear();
    printSummary({ ...base, filesWithIssues: 1, failed: false }, false);
    expect(log.mock.calls.join("\n")).toMatch(
      /No issues at the configured fail level/,
    );

    log.mockClear();
    printSummary({ ...base, failed: true }, false);
    expect(log.mock.calls.join("\n")).toMatch(/Checks reported issues/);
  });
});

describe("initProject", () => {
  it("returns the package version", () => {
    expect(packageVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("writes config, slop-gate, and Vale files", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ai-text-check-init-"));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    initProject(cwd, true);
    expect(fs.existsSync(path.join(cwd, "ai-text-check.config.json"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(cwd, "slop-gate.config.json"))).toBe(true);
    expect(fs.existsSync(path.join(cwd, ".vale.ini"))).toBe(true);
    expect(
      fs.existsSync(
        path.join(cwd, ".vale", "styles", "AiTextCheck", "meta.json"),
      ),
    ).toBe(true);
    expect(fs.readFileSync(path.join(cwd, ".vale.ini"), "utf8")).toContain(
      "StylesPath = .vale/styles",
    );

    initProject(cwd, true);
    expect(log.mock.calls.flat().join("\n")).toMatch(/already exists/);
  });

  it("skips Vale files when withVale is false", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "ai-text-check-init-"));
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    initProject(cwd, false);
    expect(fs.existsSync(path.join(cwd, ".vale.ini"))).toBe(false);
  });
});
