import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkText } from "../src/index.js";
import { checkFile, checkFiles, collectFiles } from "../src/node/index.js";
import { resolveConfig } from "../src/config.js";
import { parseArgs } from "../src/cli/args.js";

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

describe("file checks", () => {
  it("flags the AI sample fixture", () => {
    const report = checkFile(path.join(fixtures, "ai-sample.md"), {
      config: { engines: { vale: false } },
    });
    expect(report.issues.length).toBeGreaterThan(0);
    expect(
      report.issues.some((issue) => issue.rule === "in-todays-world"),
    ).toBe(true);
  });

  it("scores the clean fixture highly", () => {
    const report = checkFile(path.join(fixtures, "clean.md"), {
      config: {
        engines: {
          vale: false,
          writeGood: false,
          retext: false,
          isThisAiSlop: false,
          veldica: false,
          cleanWriting: false,
        },
      },
    });
    const blocking = report.issues.filter(
      (issue) => issue.severity === "error" || issue.severity === "warn",
    );
    expect(blocking).toEqual([]);
    expect(report.score).toBeGreaterThan(80);
  });

  it("collects markdown fixtures", () => {
    const files = collectFiles([fixtures], resolveConfig({}));
    expect(files.some((file) => file.endsWith("ai-sample.md"))).toBe(true);
  });

  it("summarizes a directory", () => {
    const summary = checkFiles([fixtures], {
      config: { failOn: "error", engines: { vale: false } },
    });
    expect(summary.filesChecked).toBeGreaterThanOrEqual(2);
    expect(summary.reports.length).toBe(summary.filesChecked);
  });

  it("merges Vale findings when the engine is on", () => {
    const summary = checkFiles([path.join(fixtures, "ai-sample.md")], {
      config: {
        failOn: "error",
        engines: {
          writeGood: false,
          retext: false,
          isThisAiSlop: false,
          veldica: false,
          cleanWriting: false,
        },
      },
    });
    expect(summary.reports[0]?.enginesRun).toContain("vale");
    expect(
      summary.reports[0]?.issues.some((issue) => issue.engine === "vale"),
    ).toBe(true);
  });
});

describe("CLI args", () => {
  it("parses mixed flags", () => {
    const options = parseArgs([
      "--fix",
      "--fail-on",
      "error",
      "--preset",
      "ai",
      "content",
    ]);
    expect(options.fix).toBe(true);
    expect(options.failOn).toBe("error");
    expect(options.preset).toBe("ai");
    expect(options.paths).toEqual(["content"]);
    expect(options.vale).toBe(true);
  });

  it("turns Vale off with --no-vale", () => {
    const options = parseArgs(["--no-vale", "docs"]);
    expect(options.vale).toBe(false);
    expect(options.paths).toEqual(["docs"]);
  });

  it("rejects unknown flags", () => {
    expect(() => parseArgs(["--nope"])).toThrow(/Unknown flag/);
  });
});

describe("checkText on fixtures", () => {
  it("reads utf8 files without throwing", () => {
    const raw = fs.readFileSync(path.join(fixtures, "clean.md"), "utf8");
    expect(() => checkText(raw, { source: "clean.md" })).not.toThrow();
  });
});
