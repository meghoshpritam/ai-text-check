import type { Severity, TextFormat, UserConfig } from "../types.js";

export type CliCommand = "check" | "init" | "help" | "version";

export type CliOptions = {
  command: CliCommand;
  paths: string[];
  fix: boolean;
  sanitize: boolean;
  json: boolean;
  verbose: boolean;
  vale: boolean;
  slop: boolean;
  writeGood: boolean;
  retext: boolean;
  ignoreEmojis: boolean;
  minScore?: number;
  failOn?: Severity;
  format?: TextFormat;
  preset?: UserConfig["preset"];
  configPath?: string;
  ignoreRules: string[];
  valeArgs: string[];
};

function isSeverity(value: string): value is Severity {
  return value === "error" || value === "warn" || value === "info";
}

function isFormat(value: string): value is TextFormat {
  return value === "auto" || value === "plain" || value === "markdown";
}

export function printHelp(): void {
  console.log(`ai-text-check — one-point AI writing-tell, grammar, and typography checks

Usage:
  ai-text-check [paths...] [options]
  ai-text-check init [--vale]
  ai-text-check --help
  ai-text-check --version

Options:
  --fix              Apply safe automatic fixes (filler openers, whitespace)
  --sanitize         Normalize AI typography (dashes, smart quotes, ellipses)
  --json             Print a machine-readable report
  --verbose          Show passing files too
  --min-score N      Exit 1 if any file scores below N (0-100)
  --fail-on LEVEL    Exit 1 on issues at or above LEVEL (error|warn|info)
  --preset NAME      default | strict | ai | grammar
  --format NAME      auto | plain | markdown
  --no-vale          Skip the Vale prose engine
  --no-slop          Skip slop-gate vocabulary and is-this-ai-slop
  --no-write-good    Skip the write-good grammar engine
  --no-retext        Skip retext (passive, readability, simplify, repeats)
  --ignore-emojis    Allow emojis (skip the ai-emojis rule; off by default)
  --ignore-rule ID   Ignore a rule (repeatable)
  --config PATH      Path to ai-text-check.config.json
  --help, -h         Show this help
  --version, -v      Show version
  --                 Extra flags after -- are passed to Vale

By default every local engine runs: polish, slop-gate, write-good, retext,
is-this-ai-slop, Veldica, clean-writing, and Vale. Emoji in prose is flagged
as an AI tell unless --ignore-emojis (or ignoreEmojis: true) is set.

Examples:
  ai-text-check content
  ai-text-check --fix --min-score 70 docs
  ai-text-check --preset ai README.md
  ai-text-check --json --fail-on error .
`);
}

export function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    command: "check",
    paths: [],
    fix: false,
    sanitize: false,
    json: false,
    verbose: false,
    vale: true,
    slop: true,
    writeGood: true,
    retext: true,
    ignoreEmojis: false,
    ignoreRules: [],
    valeArgs: [],
  };

  let parsingVale = false;
  const args = [...argv];
  if (args[0] === "init") {
    options.command = "init";
    args.shift();
  } else if (args[0] === "help") {
    options.command = "help";
    return options;
  } else if (args[0] === "version") {
    options.command = "version";
    return options;
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg === "--") {
      parsingVale = true;
      continue;
    }
    if (parsingVale) {
      options.valeArgs.push(arg);
      continue;
    }
    switch (arg) {
      case "--help":
      case "-h":
        options.command = "help";
        return options;
      case "--version":
      case "-v":
        options.command = "version";
        return options;
      case "--fix":
        options.fix = true;
        break;
      case "--sanitize":
        options.sanitize = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--verbose":
        options.verbose = true;
        break;
      case "--vale":
        options.vale = true;
        break;
      case "--no-vale":
        options.vale = false;
        break;
      case "--slop":
        options.slop = true;
        break;
      case "--no-slop":
        options.slop = false;
        break;
      case "--no-write-good":
        options.writeGood = false;
        break;
      case "--no-retext":
        options.retext = false;
        break;
      case "--ignore-emojis":
        options.ignoreEmojis = true;
        break;
      case "--min-score": {
        const value = Number(args[++i]);
        if (!Number.isFinite(value)) {
          throw new Error("--min-score requires a number");
        }
        options.minScore = value;
        break;
      }
      case "--fail-on": {
        const value = args[++i];
        if (!value || !isSeverity(value)) {
          throw new Error("--fail-on must be error, warn, or info");
        }
        options.failOn = value;
        break;
      }
      case "--preset": {
        const value = args[++i];
        if (
          value !== "default" &&
          value !== "strict" &&
          value !== "ai" &&
          value !== "grammar"
        ) {
          throw new Error("--preset must be default, strict, ai, or grammar");
        }
        options.preset = value;
        break;
      }
      case "--format": {
        const value = args[++i];
        if (!value || !isFormat(value)) {
          throw new Error("--format must be auto, plain, or markdown");
        }
        options.format = value;
        break;
      }
      case "--ignore-rule": {
        const value = args[++i];
        if (!value) throw new Error("--ignore-rule requires a rule id");
        options.ignoreRules.push(value);
        break;
      }
      case "--config": {
        const value = args[++i];
        if (!value) throw new Error("--config requires a path");
        options.configPath = value;
        break;
      }
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown flag: ${arg}`);
        }
        options.paths.push(arg);
    }
  }

  return options;
}

export function toUserConfig(options: CliOptions): UserConfig {
  const config: UserConfig = {};
  if (options.preset) config.preset = options.preset;
  if (options.format) config.format = options.format;
  if (options.failOn) config.failOn = options.failOn;
  if (options.minScore !== undefined) config.minScore = options.minScore;
  if (options.ignoreRules.length > 0) config.ignoreRules = options.ignoreRules;
  if (options.ignoreEmojis) config.ignoreEmojis = true;

  const engines: NonNullable<UserConfig["engines"]> = {};
  if (!options.vale) engines.vale = false;
  if (!options.slop) {
    engines.slopGate = false;
    engines.isThisAiSlop = false;
  }
  if (!options.writeGood) engines.writeGood = false;
  if (!options.retext) engines.retext = false;
  if (Object.keys(engines).length > 0) config.engines = engines;

  return config;
}
