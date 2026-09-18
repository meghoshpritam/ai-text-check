import fs from "node:fs";
import { checkText } from "../check.js";
import { resolveConfig } from "../config.js";
import { collectValeIssues, valeIssuesForFile } from "../engines/vale.js";
import { uniqueEngines } from "../engines/tag.js";
import { serializeFixedDocument } from "../markdown.js";
import { hasFailingIssue, scoreFromIssues } from "../score.js";
import type {
  CheckOptions,
  CheckReport,
  CheckSummary,
  UserConfig,
} from "../types.js";
import { collectFiles } from "./files.js";
import { findValeBinary } from "./vale.js";

function attachVale(
  report: CheckReport,
  extra: ReturnType<typeof valeIssuesForFile>,
  ignoreRules: Set<string>,
): CheckReport {
  const issues = [
    ...report.issues,
    ...extra.filter((issue) => !ignoreRules.has(issue.rule)),
  ];
  return {
    ...report,
    issues,
    score: scoreFromIssues(issues),
    enginesRun: uniqueEngines([...report.enginesRun, "vale"]),
    stats: {
      ...report.stats,
      aiPatternHits: issues.filter((issue) => issue.category === "ai").length,
    },
  };
}

export function checkFile(
  filePath: string,
  options: CheckOptions = {},
): CheckReport {
  const raw = fs.readFileSync(filePath, "utf8");
  return checkText(raw, { ...options, source: filePath });
}

export function checkFiles(
  paths: string[],
  options: CheckOptions & {
    writeFixes?: boolean;
    config?: UserConfig;
    valeArgs?: string[];
  } = {},
): CheckSummary {
  const config = resolveConfig(options.config);
  const files = collectFiles(paths, config);
  const reports: CheckReport[] = [];
  let filesFixed = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const applyFixes = options.writeFixes ?? options.applyFixes ?? false;
    let report = checkText(raw, {
      source: file,
      applyFixes,
      ...(options.format ? { format: options.format } : {}),
      ...(options.config ? { config: options.config } : {}),
    });

    if ((options.writeFixes ?? false) && report.fixedText) {
      const next = serializeFixedDocument(raw, report.fixedText);
      fs.writeFileSync(file, next, "utf8");
      filesFixed += 1;
      report = checkText(next, {
        source: file,
        ...(options.format ? { format: options.format } : {}),
        ...(options.config ? { config: options.config } : {}),
      });
    }

    reports.push(report);
  }

  if (config.engines.vale && files.length > 0 && findValeBinary()) {
    const ignoreRules = new Set(config.ignoreRules);
    const valeByFile = collectValeIssues(
      files,
      options.valeArgs ? { extraArgs: options.valeArgs } : {},
    );
    for (let i = 0; i < reports.length; i++) {
      const report = reports[i];
      if (!report) continue;
      reports[i] = attachVale(
        report,
        valeIssuesForFile(valeByFile, report.source),
        ignoreRules,
      );
    }
  }

  const filesWithIssues = reports.filter(
    (item) => item.issues.length > 0,
  ).length;
  const averageScore =
    reports.length === 0
      ? 100
      : reports.reduce((sum, item) => sum + item.score, 0) / reports.length;
  const failed =
    reports.some((item) => item.score < config.minScore) ||
    reports.some((item) => hasFailingIssue(item.issues, config.failOn));

  return {
    reports,
    filesChecked: reports.length,
    filesWithIssues,
    filesFixed,
    averageScore,
    failed,
  };
}
