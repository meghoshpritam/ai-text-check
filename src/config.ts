import type {
  ChecksConfig,
  EnginesConfig,
  PresetName,
  ResolvedConfig,
  UserConfig,
} from "./types.js";

const PRESETS: Record<PresetName, Required<ChecksConfig>> = {
  default: {
    ai: true,
    grammar: true,
    readability: true,
    structure: true,
    seo: true,
    typography: true,
  },
  strict: {
    ai: true,
    grammar: true,
    readability: true,
    structure: true,
    seo: true,
    typography: true,
  },
  ai: {
    ai: true,
    grammar: false,
    readability: false,
    structure: false,
    seo: false,
    typography: true,
  },
  grammar: {
    ai: false,
    grammar: true,
    readability: true,
    structure: false,
    seo: false,
    typography: false,
  },
};

const ENGINE_PRESETS: Record<PresetName, Required<EnginesConfig>> = {
  default: {
    polish: true,
    slopGate: true,
    writeGood: true,
    retext: true,
    isThisAiSlop: true,
    veldica: true,
    cleanWriting: true,
    aiSlopLinter: true,
    slopDetector: true,
    proseSlop: true,
    vale: true,
  },
  strict: {
    polish: true,
    slopGate: true,
    writeGood: true,
    retext: true,
    isThisAiSlop: true,
    veldica: true,
    cleanWriting: true,
    aiSlopLinter: true,
    slopDetector: true,
    proseSlop: true,
    vale: true,
  },
  ai: {
    polish: true,
    slopGate: true,
    writeGood: false,
    retext: false,
    isThisAiSlop: true,
    veldica: true,
    cleanWriting: true,
    aiSlopLinter: true,
    slopDetector: true,
    proseSlop: true,
    vale: true,
  },
  grammar: {
    polish: true,
    slopGate: false,
    writeGood: true,
    retext: true,
    isThisAiSlop: false,
    veldica: false,
    cleanWriting: true,
    aiSlopLinter: false,
    slopDetector: false,
    proseSlop: false,
    vale: true,
  },
};

const DEFAULT_EXTENSIONS = [".md", ".mdx", ".markdown", ".txt"];

const BOOLEAN_KEYS = [
  "ai",
  "grammar",
  "readability",
  "structure",
  "seo",
  "typography",
] as const;

const ENGINE_KEYS = [
  "polish",
  "slopGate",
  "writeGood",
  "retext",
  "isThisAiSlop",
  "veldica",
  "cleanWriting",
  "aiSlopLinter",
  "slopDetector",
  "proseSlop",
  "vale",
] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function expectNumber(
  value: unknown,
  path: string,
  errors: string[],
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number`);
    return undefined;
  }
  return value;
}

function expectBoolean(
  value: unknown,
  path: string,
  errors: string[],
): boolean | undefined {
  if (value === undefined) return undefined;
  if (!isBoolean(value)) {
    errors.push(`${path} must be a boolean`);
    return undefined;
  }
  return value;
}

function assignDefined<T extends object>(
  target: T,
  key: keyof T,
  value: T[keyof T] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function validateChecks(
  value: unknown,
  errors: string[],
): ChecksConfig | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value)) {
    errors.push("checks must be an object");
    return undefined;
  }

  const checks: ChecksConfig = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!BOOLEAN_KEYS.includes(key as (typeof BOOLEAN_KEYS)[number])) {
      errors.push(`Unknown checks key: ${key}`);
      continue;
    }
    const parsed = expectBoolean(raw, `checks.${key}`, errors);
    if (parsed !== undefined) {
      checks[key as keyof ChecksConfig] = parsed;
    }
  }
  return checks;
}

function validateEngines(
  value: unknown,
  errors: string[],
): EnginesConfig | undefined {
  if (value === undefined) return undefined;
  if (!isObject(value)) {
    errors.push("engines must be an object");
    return undefined;
  }

  const engines: EnginesConfig = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!ENGINE_KEYS.includes(key as (typeof ENGINE_KEYS)[number])) {
      errors.push(`Unknown engines key: ${key}`);
      continue;
    }
    const parsed = expectBoolean(raw, `engines.${key}`, errors);
    if (parsed !== undefined) {
      engines[key as keyof EnginesConfig] = parsed;
    }
  }
  return engines;
}

export function validateUserConfig(value: unknown): {
  config: UserConfig;
  errors: string[];
} {
  const errors: string[] = [];
  if (value === undefined || value === null) {
    return { config: {}, errors };
  }
  if (!isObject(value)) {
    return { config: {}, errors: ["Config must be an object"] };
  }

  const config: UserConfig = {};

  if (value.preset !== undefined) {
    if (
      value.preset !== "default" &&
      value.preset !== "strict" &&
      value.preset !== "ai" &&
      value.preset !== "grammar"
    ) {
      errors.push('preset must be "default", "strict", "ai", or "grammar"');
    } else {
      config.preset = value.preset;
    }
  }

  const checks = validateChecks(value.checks, errors);
  if (checks) config.checks = checks;

  const engines = validateEngines(value.engines, errors);
  if (engines) config.engines = engines;

  if (value.format !== undefined) {
    if (
      value.format !== "auto" &&
      value.format !== "plain" &&
      value.format !== "markdown"
    ) {
      errors.push('format must be "auto", "plain", or "markdown"');
    } else {
      config.format = value.format;
    }
  }

  if (value.failOn !== undefined) {
    if (
      value.failOn !== "error" &&
      value.failOn !== "warn" &&
      value.failOn !== "info"
    ) {
      errors.push('failOn must be "error", "warn", or "info"');
    } else {
      config.failOn = value.failOn;
    }
  }

  const minScore = expectNumber(value.minScore, "minScore", errors);
  if (minScore !== undefined) {
    if (minScore < 0 || minScore > 100) {
      errors.push("minScore must be between 0 and 100");
    } else {
      config.minScore = minScore;
    }
  }

  if (value.ignoreRules !== undefined) {
    if (!isStringArray(value.ignoreRules)) {
      errors.push("ignoreRules must be an array of strings");
    } else {
      config.ignoreRules = value.ignoreRules;
    }
  }

  const ignoreEmojis = expectBoolean(
    value.ignoreEmojis,
    "ignoreEmojis",
    errors,
  );
  if (ignoreEmojis !== undefined) {
    config.ignoreEmojis = ignoreEmojis;
  }

  if (value.include !== undefined) {
    if (!isStringArray(value.include)) {
      errors.push("include must be an array of strings");
    } else {
      config.include = value.include;
    }
  }

  if (value.exclude !== undefined) {
    if (!isStringArray(value.exclude)) {
      errors.push("exclude must be an array of strings");
    } else {
      config.exclude = value.exclude;
    }
  }

  if (value.extensions !== undefined) {
    if (!isStringArray(value.extensions)) {
      errors.push("extensions must be an array of strings");
    } else {
      config.extensions = value.extensions;
    }
  }

  if (value.markdown !== undefined) {
    if (!isObject(value.markdown)) {
      errors.push("markdown must be an object");
    } else {
      const markdown: NonNullable<UserConfig["markdown"]> = {};
      assignDefined(
        markdown,
        "skipCode",
        expectBoolean(value.markdown.skipCode, "markdown.skipCode", errors),
      );
      assignDefined(
        markdown,
        "skipFrontmatter",
        expectBoolean(
          value.markdown.skipFrontmatter,
          "markdown.skipFrontmatter",
          errors,
        ),
      );
      assignDefined(
        markdown,
        "skipHtml",
        expectBoolean(value.markdown.skipHtml, "markdown.skipHtml", errors),
      );
      assignDefined(
        markdown,
        "skipTables",
        expectBoolean(value.markdown.skipTables, "markdown.skipTables", errors),
      );
      config.markdown = markdown;
    }
  }

  if (value.seo !== undefined) {
    if (!isObject(value.seo)) {
      errors.push("seo must be an object");
    } else {
      const seo: NonNullable<UserConfig["seo"]> = {};
      assignDefined(
        seo,
        "titleMin",
        expectNumber(value.seo.titleMin, "seo.titleMin", errors),
      );
      assignDefined(
        seo,
        "titleMax",
        expectNumber(value.seo.titleMax, "seo.titleMax", errors),
      );
      assignDefined(
        seo,
        "descriptionMin",
        expectNumber(value.seo.descriptionMin, "seo.descriptionMin", errors),
      );
      assignDefined(
        seo,
        "descriptionMax",
        expectNumber(value.seo.descriptionMax, "seo.descriptionMax", errors),
      );
      config.seo = seo;
    }
  }

  if (value.readability !== undefined) {
    if (!isObject(value.readability)) {
      errors.push("readability must be an object");
    } else {
      const readability: NonNullable<UserConfig["readability"]> = {};
      assignDefined(
        readability,
        "avgSentenceWarn",
        expectNumber(
          value.readability.avgSentenceWarn,
          "readability.avgSentenceWarn",
          errors,
        ),
      );
      assignDefined(
        readability,
        "longSentenceWords",
        expectNumber(
          value.readability.longSentenceWords,
          "readability.longSentenceWords",
          errors,
        ),
      );
      assignDefined(
        readability,
        "longParagraphWords",
        expectNumber(
          value.readability.longParagraphWords,
          "readability.longParagraphWords",
          errors,
        ),
      );
      assignDefined(
        readability,
        "passiveRatio",
        expectNumber(
          value.readability.passiveRatio,
          "readability.passiveRatio",
          errors,
        ),
      );
      config.readability = readability;
    }
  }

  const known = new Set([
    "preset",
    "checks",
    "engines",
    "format",
    "failOn",
    "minScore",
    "ignoreRules",
    "ignoreEmojis",
    "include",
    "exclude",
    "extensions",
    "markdown",
    "seo",
    "readability",
  ]);
  for (const key of Object.keys(value)) {
    if (!known.has(key)) {
      errors.push(`Unknown config key: ${key}`);
    }
  }

  return { config, errors };
}

export function resolveConfig(user: UserConfig = {}): ResolvedConfig {
  const preset = user.preset ?? "default";
  return {
    preset,
    checks: { ...PRESETS[preset], ...user.checks },
    engines: { ...ENGINE_PRESETS[preset], ...user.engines },
    format: user.format ?? "auto",
    failOn: user.failOn ?? "warn",
    minScore: user.minScore ?? 0,
    ignoreRules: (() => {
      const rules = [...(user.ignoreRules ?? [])];
      if (user.ignoreEmojis ?? false) {
        rules.push("ai-emojis");
      }
      return rules;
    })(),
    ignoreEmojis: user.ignoreEmojis ?? false,
    include: user.include ?? [],
    exclude: user.exclude ?? [],
    extensions: (user.extensions ?? DEFAULT_EXTENSIONS).map((ext) =>
      ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`,
    ),
    markdown: {
      skipCode: user.markdown?.skipCode ?? true,
      skipFrontmatter: user.markdown?.skipFrontmatter ?? true,
      skipHtml: user.markdown?.skipHtml ?? true,
      skipTables: user.markdown?.skipTables ?? true,
    },
    seo: {
      titleMin: user.seo?.titleMin ?? 20,
      titleMax: user.seo?.titleMax ?? 65,
      descriptionMin: user.seo?.descriptionMin ?? 80,
      descriptionMax: user.seo?.descriptionMax ?? 165,
    },
    readability: {
      avgSentenceWarn: user.readability?.avgSentenceWarn ?? 24,
      longSentenceWords: user.readability?.longSentenceWords ?? 35,
      longParagraphWords: user.readability?.longParagraphWords ?? 120,
      passiveRatio: user.readability?.passiveRatio ?? 0.25,
    },
  };
}

export function defineConfig(config: UserConfig): UserConfig {
  const { errors } = validateUserConfig(config);
  if (errors.length > 0) {
    throw new Error(`Invalid ai-text-check config:\n- ${errors.join("\n- ")}`);
  }
  return config;
}

export function isStrictPreset(config: ResolvedConfig): boolean {
  return config.preset === "strict";
}
