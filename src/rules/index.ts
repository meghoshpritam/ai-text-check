import { isStrictPreset } from "../config.js";
import type { PatternRule, ResolvedConfig } from "../types.js";
import { AI_PATTERN_RULES } from "./data/ai.js";
import {
  SLOP_PUNCTUATION_RULES,
  SLOP_VOCABULARY_RULES,
} from "./data/slop-gate.js";

export function getPolishAiRules(): PatternRule[] {
  return [...AI_PATTERN_RULES];
}

export function getSlopGateRules(config: ResolvedConfig): PatternRule[] {
  const rules = [...SLOP_VOCABULARY_RULES];
  if (isStrictPreset(config)) {
    rules.push(...SLOP_PUNCTUATION_RULES);
  }
  return rules;
}

export function getAiRules(config: ResolvedConfig): PatternRule[] {
  return [...getPolishAiRules(), ...getSlopGateRules(config)];
}

export function getAutoFixRules(): PatternRule[] {
  return AI_PATTERN_RULES.filter(
    (rule) => rule.autoFix && rule.replacement !== undefined,
  );
}
