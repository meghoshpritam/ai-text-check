import { resolveConfig } from "./config.js";
import { runAiSlopLinter } from "./engines/ai-slop-linter.js";
import { runCleanWriting } from "./engines/clean-writing.js";
import { runIsThisAiSlop } from "./engines/is-this-ai-slop.js";
import { runProseSlop } from "./engines/prose-slop.js";
import { runRetext } from "./engines/retext.js";
import { runSlopDetector } from "./engines/slop-detector.js";
import { tagEngine, uniqueEngines } from "./engines/tag.js";
import { runVeldica } from "./engines/veldica.js";
import { runWriteGood } from "./engines/write-good.js";
import { applyAutoFixes } from "./fix.js";
import { parseDocument, pathBasename } from "./markdown.js";
import { getPolishAiRules, getSlopGateRules } from "./rules/index.js";
import { runPatternRules } from "./rules/engine.js";
import {
  analyzeReadability,
  countPassiveVoice,
  suggestHumanTouches,
} from "./rules/readability.js";
import { analyzeFrontmatter } from "./rules/seo.js";
import { analyzeStructure } from "./rules/structure.js";
import { analyzeTypography } from "./rules/typography.js";
import {
  countWords,
  fleschReadingEase,
  resolveFormat,
  splitParagraphs,
  splitSentences,
} from "./scan.js";
import { scoreFromIssues } from "./score.js";
import type {
  CheckOptions,
  CheckReport,
  EngineName,
  Issue,
  ResolvedConfig,
  TextStats,
} from "./types.js";

function computeStats(
  body: string,
  titleLength: number,
  descriptionLength: number,
  issues: Issue[],
): TextStats {
  const sentences = splitSentences(body);
  const paragraphs = splitParagraphs(body);
  const words = countWords(body);
  const readable = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]+`/g, " ");

  return {
    words,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    avgSentenceLength: sentences.length > 0 ? words / sentences.length : 0,
    avgParagraphLength: paragraphs.length > 0 ? words / paragraphs.length : 0,
    passiveVoiceHits: countPassiveVoice(body),
    aiPatternHits: issues.filter((issue) => issue.category === "ai").length,
    fleschReadingEase: fleschReadingEase(words, sentences.length, readable),
    titleLength,
    descriptionLength,
  };
}

function collectIssues(
  body: string,
  frontmatter: Record<string, unknown>,
  format: "plain" | "markdown",
  config: ResolvedConfig,
  source: string,
): { issues: Issue[]; enginesRun: EngineName[] } {
  const ignoreRules = new Set(config.ignoreRules);
  const issues: Issue[] = [];
  const enginesRun: EngineName[] = [];
  const patternOptions = {
    format,
    markdown: config.markdown,
    ignoreRules,
  };

  if (config.engines.polish) {
    enginesRun.push("polish");
    if (config.checks.ai) {
      issues.push(
        ...tagEngine(
          runPatternRules(body, getPolishAiRules(), patternOptions),
          "polish",
        ),
      );
    }
    if (config.checks.readability) {
      issues.push(...tagEngine(analyzeReadability(body, config), "polish"));
      if (format === "markdown") {
        issues.push(...tagEngine(suggestHumanTouches(body), "polish"));
      }
    }
    if (config.checks.structure && format === "markdown") {
      issues.push(...tagEngine(analyzeStructure(body), "polish"));
    }
    if (config.checks.seo && format === "markdown") {
      issues.push(
        ...tagEngine(analyzeFrontmatter(frontmatter, config), "polish"),
      );
    }
    if (config.checks.typography) {
      issues.push(
        ...tagEngine(
          analyzeTypography(body, {
            skipCode: format === "markdown" && config.markdown.skipCode,
          }),
          "polish",
        ),
      );
    }
  }

  if (config.engines.slopGate && config.checks.ai) {
    enginesRun.push("slop-gate");
    issues.push(
      ...tagEngine(
        runPatternRules(body, getSlopGateRules(config), patternOptions),
        "slop-gate",
      ),
    );
  }

  if (config.engines.writeGood && config.checks.grammar) {
    enginesRun.push("write-good");
    issues.push(...runWriteGood(body));
  }

  if (
    config.engines.retext &&
    (config.checks.grammar || config.checks.readability)
  ) {
    enginesRun.push("retext");
    issues.push(...runRetext(body));
  }

  if (config.engines.isThisAiSlop && config.checks.ai) {
    enginesRun.push("is-this-ai-slop");
    issues.push(...runIsThisAiSlop(body));
  }

  if (config.engines.veldica && config.checks.ai) {
    enginesRun.push("veldica");
    issues.push(...runVeldica(body));
  }

  if (
    config.engines.cleanWriting &&
    (config.checks.ai || config.checks.grammar)
  ) {
    enginesRun.push("clean-writing");
    issues.push(...runCleanWriting(body));
  }

  if (config.engines.aiSlopLinter && config.checks.ai) {
    enginesRun.push("ai-slop-linter");
    issues.push(...runAiSlopLinter(body, { source }));
  }

  if (config.engines.slopDetector && config.checks.ai) {
    enginesRun.push("slop-detector");
    issues.push(...runSlopDetector(body));
  }

  if (config.engines.proseSlop && config.checks.ai) {
    enginesRun.push("prose-slop");
    issues.push(...runProseSlop(body, { format }));
  }

  return {
    issues: issues.filter((issue) => !ignoreRules.has(issue.rule)),
    enginesRun: uniqueEngines(enginesRun),
  };
}

export function checkText(
  text: string,
  options: CheckOptions = {},
): CheckReport {
  const config = resolveConfig(options.config);
  const source = options.source ?? "<text>";
  const format = resolveFormat(text, options.format ?? config.format, source);
  const parsed =
    format === "markdown"
      ? parseDocument(text)
      : { frontmatter: {} as Record<string, unknown>, body: text };
  const body = parsed.body.trim();

  const { issues, enginesRun } = collectIssues(
    body,
    parsed.frontmatter,
    format,
    config,
    source,
  );
  const title = String(parsed.frontmatter.title ?? pathBasename(source));

  const report: CheckReport = {
    source,
    title,
    format,
    score: scoreFromIssues(issues),
    issues,
    stats: computeStats(
      body,
      String(parsed.frontmatter.title ?? "").length,
      String(parsed.frontmatter.description ?? "").length,
      issues,
    ),
    enginesRun,
  };

  if (options.applyFixes) {
    const fixedBody = applyAutoFixes(body);
    const normalized = body.endsWith("\n") ? body : `${body}\n`;
    if (fixedBody !== normalized) {
      report.fixedText = fixedBody;
    }
  }

  return report;
}
