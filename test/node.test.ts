import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkText } from "../src/index.js";
import { collectValeIssues, valeIssuesForFile } from "../src/engines/vale.js";
import { ConfigError, loadConfig } from "../src/node/config-load.js";
import { checkFiles, collectFiles } from "../src/node/index.js";
import { findSlopGateBinary, runSlopGate } from "../src/node/slop-gate.js";
import { bundledValeIni, findValeBinary, runVale } from "../src/node/vale.js";
import { resolveConfig } from "../src/config.js";
import { onlyEngines } from "./helpers.js";

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

describe("collectFiles", () => {
  it("filters by include, exclude, and extension", () => {
    const all = collectFiles([fixtures], resolveConfig({}));
    expect(all.some((file) => file.endsWith("ai-sample.md"))).toBe(true);

    const included = collectFiles(
      [fixtures],
      resolveConfig({ include: ["ai-sample"] }),
    );
    expect(included).toHaveLength(1);

    const txtOnly = collectFiles(
      [fixtures],
      resolveConfig({ extensions: [".txt"] }),
    );
    expect(txtOnly).toEqual([]);

    const skipped = collectFiles(
      [path.dirname(fixtures)],
      resolveConfig({ exclude: ["fixtures"] }),
    );
    expect(skipped.some((file) => file.includes("fixtures"))).toBe(false);
  });

  it("ignores missing roots", () => {
    expect(
      collectFiles(["/tmp/does-not-exist-ai-text-check"], resolveConfig({})),
    ).toEqual([]);
  });
});

describe("checkFiles", () => {
  it("returns an empty passing summary when nothing matches", () => {
    const summary = checkFiles(["/tmp/does-not-exist-ai-text-check"]);
    expect(summary.filesChecked).toBe(0);
    expect(summary.averageScore).toBe(100);
    expect(summary.failed).toBe(false);
  });

  it("fails when the score is below minScore", () => {
    const summary = checkFiles([path.join(fixtures, "ai-sample.md")], {
      config: {
        minScore: 100,
        failOn: "error",
        engines: onlyEngines({ polish: true, slopGate: true }),
      },
    });
    expect(summary.failed).toBe(true);
  });

  it("writes safe auto-fixes to disk", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-text-check-files-"));
    const file = path.join(dir, "note.md");
    fs.writeFileSync(
      file,
      "It's important to note that retries hide the bug.\n",
      "utf8",
    );
    const summary = checkFiles([file], {
      writeFixes: true,
      config: {
        failOn: "error",
        engines: onlyEngines({ polish: true }),
        checks: { seo: false, structure: false, typography: false },
      },
    });
    expect(summary.filesFixed).toBe(1);
    expect(fs.readFileSync(file, "utf8")).toContain("Retries hide the bug.");
  });
});

describe("Vale adapter", () => {
  it("finds the native binary and bundled ini", () => {
    const binary = findValeBinary();
    expect(binary).toBeTruthy();
    expect(fs.existsSync(binary ?? "")).toBe(true);
    expect(fs.existsSync(bundledValeIni())).toBe(true);
  });

  it("runs Vale JSON and maps alerts onto the file", () => {
    const file = path.join(fixtures, "ai-sample.md");
    const byFile = collectValeIssues([file]);
    const issues = valeIssuesForFile(byFile, file);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((issue) => issue.engine === "vale")).toBe(true);
    expect(valeIssuesForFile(byFile, path.resolve(file)).length).toBe(
      issues.length,
    );
  });

  it("returns an empty map for no files", () => {
    expect(collectValeIssues([]).size).toBe(0);
  });

  it("captures Vale stdout for a real file", () => {
    const result = runVale([path.join(fixtures, "ai-sample.md")], {
      extraArgs: ["--output=JSON"],
    });
    expect(result.stdout.trim().startsWith("{")).toBe(true);
  });
});

describe("slop-gate adapter", () => {
  it("finds the CLI and flags the AI sample", () => {
    expect(findSlopGateBinary()).toBeTruthy();
    const result = runSlopGate([path.join(fixtures, "ai-sample.md")]);
    expect(result.status).toBeGreaterThan(0);
    expect(`${result.stdout}${result.stderr}`).toMatch(
      /delve|leverage|tapestry/i,
    );
  });
});

describe("loadConfig", () => {
  it("returns an empty object when no config exists", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-text-check-cfg-"));
    await expect(loadConfig(dir)).resolves.toEqual({});
  });

  it("loads a JSON config file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-text-check-cfg-"));
    fs.writeFileSync(
      path.join(dir, "ai-text-check.config.json"),
      JSON.stringify({ preset: "ai", failOn: "error" }),
      "utf8",
    );
    await expect(loadConfig(dir)).resolves.toEqual({
      preset: "ai",
      failOn: "error",
    });
  });

  it("throws ConfigError for invalid JSON config", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-text-check-cfg-"));
    fs.writeFileSync(
      path.join(dir, "ai-text-check.config.json"),
      JSON.stringify({ preset: "nope" }),
      "utf8",
    );
    await expect(loadConfig(dir)).rejects.toBeInstanceOf(ConfigError);
  });

  it("loads package.json ai-text-check field", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-text-check-cfg-"));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({
        name: "demo",
        "ai-text-check": { preset: "grammar", minScore: 40 },
      }),
      "utf8",
    );
    await expect(loadConfig(dir)).resolves.toEqual({
      preset: "grammar",
      minScore: 40,
    });
  });

  it("throws ConfigError for an invalid package field", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-text-check-cfg-"));
    fs.writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ "ai-text-check": { failOn: "fatal" } }),
      "utf8",
    );
    await expect(loadConfig(dir)).rejects.toBeInstanceOf(ConfigError);
  });

  it("loads an ESM config file", async () => {
    await expect(
      loadConfig(path.join(fixtures, "config-esm")),
    ).resolves.toEqual({
      preset: "ai",
      failOn: "error",
    });
  });

  it("throws ConfigError for an invalid ESM config", async () => {
    await expect(
      loadConfig(path.join(fixtures, "config-esm-bad")),
    ).rejects.toBeInstanceOf(ConfigError);
  });
});

describe("checkText engine gating", () => {
  it("does not attach Vale from checkText", () => {
    const report = checkText("Hello world.", {
      format: "plain",
      config: { engines: onlyEngines({ vale: true, polish: true }) },
    });
    expect(report.enginesRun).not.toContain("vale");
  });
});
