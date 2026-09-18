import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateUserConfig } from "../config.js";
import type { UserConfig } from "../types.js";

const CONFIG_FILES = [
  "ai-text-check.config.json",
  "ai-text-check.config.js",
  "ai-text-check.config.mjs",
  "ai-text-check.config.cjs",
];

export class ConfigError extends Error {
  override readonly name = "ConfigError";
}

async function readPackageField(cwd: string): Promise<unknown> {
  const packagePath = path.join(cwd, "package.json");
  if (!fs.existsSync(packagePath)) return undefined;
  const raw = JSON.parse(fs.readFileSync(packagePath, "utf8")) as {
    "ai-text-check"?: unknown;
  };
  return raw["ai-text-check"];
}

export async function loadConfig(
  cwd: string = process.cwd(),
): Promise<UserConfig> {
  for (const name of CONFIG_FILES) {
    const filePath = path.join(cwd, name);
    if (!fs.existsSync(filePath)) continue;

    if (name.endsWith(".json")) {
      const raw: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const { config, errors } = validateUserConfig(raw);
      if (errors.length > 0) {
        throw new ConfigError(`Invalid ${name}:\n- ${errors.join("\n- ")}`);
      }
      return config;
    }

    const mod = (await import(pathToFileURL(filePath).href)) as {
      default?: unknown;
    };
    const { config, errors } = validateUserConfig(mod.default ?? mod);
    if (errors.length > 0) {
      throw new ConfigError(`Invalid ${name}:\n- ${errors.join("\n- ")}`);
    }
    return config;
  }

  const fromPackage = await readPackageField(cwd);
  if (fromPackage !== undefined) {
    const { config, errors } = validateUserConfig(fromPackage);
    if (errors.length > 0) {
      throw new ConfigError(
        `Invalid package.json "ai-text-check":\n- ${errors.join("\n- ")}`,
      );
    }
    return config;
  }

  return {};
}
