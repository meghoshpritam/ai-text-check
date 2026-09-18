import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveConfig, validateUserConfig } from "../config.js";
import { checkFiles } from "../node/check-files.js";
import { loadConfig } from "../node/config-load.js";
import { findValeBinary } from "../node/vale.js";
import { sanitizeMarkdown, sanitizeText } from "../sanitize.js";
import type { UserConfig } from "../types.js";
import { parseArgs, printHelp, toUserConfig } from "./args.js";
import { initProject, packageVersion } from "./init.js";
import { printReport, printSummary } from "./print.js";

function mergeConfig(base: UserConfig, overlay: UserConfig): UserConfig {
  return {
    ...base,
    ...overlay,
    checks: { ...base.checks, ...overlay.checks },
    engines: { ...base.engines, ...overlay.engines },
    ignoreRules: [...(base.ignoreRules ?? []), ...(overlay.ignoreRules ?? [])],
    markdown: { ...base.markdown, ...overlay.markdown },
    seo: { ...base.seo, ...overlay.seo },
    readability: { ...base.readability, ...overlay.readability },
  };
}

async function loadConfigFromPath(filePath: string): Promise<UserConfig> {
  if (filePath.endsWith(".json")) {
    const raw: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const { config, errors } = validateUserConfig(raw);
    if (errors.length > 0) {
      throw new Error(`Invalid config:\n- ${errors.join("\n- ")}`);
    }
    return config;
  }
  const mod = (await import(pathToFileURL(path.resolve(filePath)).href)) as {
    default?: unknown;
  };
  const { config, errors } = validateUserConfig(mod.default ?? mod);
  if (errors.length > 0) {
    throw new Error(`Invalid config:\n- ${errors.join("\n- ")}`);
  }
  return config;
}

function maybeSanitize(filePath: string, raw: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".md" || ext === ".mdx" || ext === ".markdown") {
    return sanitizeMarkdown(raw);
  }
  return sanitizeText(raw);
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options.command === "help") {
    printHelp();
    return;
  }
  if (options.command === "version") {
    console.log(packageVersion());
    return;
  }
  if (options.command === "init") {
    initProject(process.cwd(), options.vale);
    return;
  }

  const fileConfig = options.configPath
    ? await loadConfigFromPath(options.configPath)
    : await loadConfig(process.cwd());
  const userConfig = mergeConfig(fileConfig, toUserConfig(options));
  const resolved = resolveConfig(userConfig);
  const roots = options.paths.length > 0 ? options.paths : ["."];

  if (options.sanitize) {
    const summary = checkFiles(roots, {
      config: userConfig,
      writeFixes: false,
    });
    let changed = 0;
    for (const report of summary.reports) {
      const raw = fs.readFileSync(report.source, "utf8");
      const next = maybeSanitize(report.source, raw);
      if (next !== raw) {
        fs.writeFileSync(report.source, next, "utf8");
        changed += 1;
        if (!options.json) {
          console.log(`sanitized ${report.source}`);
        }
      }
    }
    if (!options.json) {
      console.log(`Sanitized ${changed} file(s).`);
    }
  }

  if (resolved.engines.vale && !findValeBinary(process.cwd())) {
    console.error(
      "Vale is enabled but the native binary was not found. Reinstall `@vvago/vale` or pass --no-vale.",
    );
    process.exitCode = 1;
    return;
  }

  const summary = checkFiles(roots, {
    config: userConfig,
    writeFixes: options.fix,
    format: options.format ?? resolved.format,
    valeArgs: options.valeArgs,
  });

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    if (summary.filesChecked === 0) {
      console.error("No matching text files found.");
      process.exitCode = 1;
      return;
    }
    for (const report of summary.reports) {
      printReport(report, options.verbose);
    }
    printSummary(summary, options.fix);
  }

  if (summary.failed) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
