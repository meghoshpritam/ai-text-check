import { checkText } from "./check.js";
import { defineConfig, resolveConfig, validateUserConfig } from "./config.js";
import { applyAutoFixes } from "./fix.js";
import { serializeFixedDocument } from "./markdown.js";
import { personalizeText } from "./personalize.js";
import {
  countSpecialChars,
  sanitizeMarkdown,
  sanitizeText,
} from "./sanitize.js";
import { hasFailingIssue, scoreFromIssues, SEVERITY_RANK } from "./score.js";

export type {
  Category,
  CheckName,
  CheckOptions,
  CheckReport,
  CheckSummary,
  ChecksConfig,
  EngineName,
  EnginesConfig,
  Issue,
  MarkdownConfig,
  PatternRule,
  PresetName,
  ReadabilityThresholds,
  ReplacementStats,
  ResolvedConfig,
  SanitizeOptions,
  SeoThresholds,
  Severity,
  TextFormat,
  TextStats,
  UserConfig,
} from "./types.js";

export {
  applyAutoFixes,
  checkText,
  countSpecialChars,
  defineConfig,
  hasFailingIssue,
  personalizeText,
  resolveConfig,
  sanitizeMarkdown,
  sanitizeText,
  scoreFromIssues,
  serializeFixedDocument,
  SEVERITY_RANK,
  validateUserConfig,
};
