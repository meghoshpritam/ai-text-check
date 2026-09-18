import type { PatternRule, Severity } from "../../types.js";
import punctuation from "../../vendor/slop-gate/punctuation.json";
import vocabulary from "../../vendor/slop-gate/vocabulary.json";

type SlopRule = {
  id: string;
  match: string;
  hint: string;
};

type SlopPack = {
  id: string;
  flags?: string;
  rules: SlopRule[];
};

function packToRules(pack: SlopPack, severity: Severity): PatternRule[] {
  const flags = `${pack.flags ?? ""}g`;
  return pack.rules.map((rule) => ({
    id: `slop-${rule.id}`,
    category: "ai" as const,
    pattern: new RegExp(rule.match, flags),
    message: `slop-gate: ${rule.id}`,
    suggestion: rule.hint,
    severity,
  }));
}

/** Vocabulary pack from mepritam's slop-gate.config.json (`rules: ["vocabulary"]`). */
export const SLOP_VOCABULARY_RULES: PatternRule[] = packToRules(
  vocabulary as SlopPack,
  "warn",
);

/** Punctuation pack used by mepritam lib/personalize-text.ts. */
export const SLOP_PUNCTUATION_RULES: PatternRule[] = packToRules(
  punctuation as SlopPack,
  "info",
);

export const SLOP_PACKS = {
  vocabulary: vocabulary as SlopPack,
  punctuation: punctuation as SlopPack,
};
