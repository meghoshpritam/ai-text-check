import type { ClauseReplacer, PatternRule } from "../../types.js";

/** Re-capitalizes the word that immediately followed a stripped lead-in clause. */
const capitalizeNext: ClauseReplacer = (_match, letter = "") =>
  letter ? letter.toUpperCase() : "";

/**
 * Exact AI_PATTERNS from mepritam-revamp-26/scripts/lib/content-polish.ts.
 */
export const AI_PATTERN_RULES: PatternRule[] = [
  {
    id: "dive-deep",
    category: "ai",
    pattern: /\b(delve|delving|dive deep|dives into|deep dive)\b/gi,
    message: "Overused AI phrasing around “dive/delve”.",
    severity: "warn",
  },
  {
    id: "in-todays-world",
    category: "ai",
    pattern:
      /\bin today(?:'s|’s) (?:fast-paced |digital |modern |ever-evolving |ever-changing |rapidly changing )*world\b[,:]?\s*([a-z])?/gi,
    message: "Generic opener (“in today's world”).",
    replacement: capitalizeNext,
    autoFix: true,
    suggestion: "Auto-fix available",
    severity: "warn",
  },
  {
    id: "important-to-note",
    category: "ai",
    pattern:
      /\b(?:it(?:'s|’s) (?:important|worth|crucial) to note that|it should be noted that)\b[,:]?\s*([a-z])?/gi,
    message: "Filler lead-in before a point.",
    replacement: capitalizeNext,
    autoFix: true,
    suggestion: "Auto-fix available",
    severity: "warn",
  },
  {
    id: "in-conclusion",
    category: "ai",
    pattern:
      /^[ \t]*(?:in conclusion|to summarize|in summary),?[ \t]*([a-z])?/gim,
    message: "Formulaic closing transition.",
    replacement: capitalizeNext,
    autoFix: true,
    suggestion: "Auto-fix available",
    severity: "warn",
  },
  {
    id: "furthermore-moreover",
    category: "ai",
    pattern: /^\s*(?:furthermore|moreover|additionally),?\s+/gim,
    message: "Stacked formal transitions at paragraph starts.",
    severity: "info",
  },
  {
    id: "leverage-utilize",
    category: "ai",
    pattern: /\b(leverage|utilize)\b/gi,
    message:
      "Corporate verb (“leverage/utilize”) — “use” usually reads more human.",
    severity: "info",
  },
  {
    id: "unlock-unleash",
    category: "ai",
    pattern:
      /\b(unlock|unleash|supercharge|game[- ]changer|paradigm shift)\b/gi,
    message: "Hype language that weakens technical credibility.",
    severity: "warn",
  },
  {
    id: "comprehensive-robust",
    category: "ai",
    pattern:
      /\b(comprehensive guide|robust solution|seamless(?:ly)?|cutting[- ]edge)\b/gi,
    message: "Vague marketing adjectives.",
    severity: "info",
  },
  {
    id: "landscape-ecosystem",
    category: "ai",
    pattern: /\b(?:the |this )?(?:\w+ )?(?:landscape|ecosystem)\b/gi,
    message: "Abstract “landscape/ecosystem” framing.",
    severity: "info",
  },
  {
    id: "whether-you-are",
    category: "ai",
    pattern: /\bwhether you(?:'re| are) (?:a |an )?\w+/gi,
    message: "Generic audience hook (“whether you're a …”).",
    severity: "info",
  },
  {
    id: "lets-explore",
    category: "ai",
    pattern: /\blet(?:'s| us) (?:explore|dive into|delve into)\b/gi,
    message: "Tutorial voice that often feels templated.",
    severity: "info",
  },
  {
    id: "tapestry-journey",
    category: "ai",
    pattern:
      /\b(?:rich tapestry|embark on (?:a |your )?journey|navigate the complexities)\b/gi,
    message: "Metaphor-heavy AI phrasing.",
    severity: "warn",
  },
  {
    id: "boilerplate-intro",
    category: "ai",
    pattern:
      /\b(in this (?:article|post|guide|tutorial), (?:we will|we'll|I will|I'll))\b/gi,
    message: "Boilerplate article intro.",
    severity: "info",
  },
  {
    id: "not-only-but-also",
    category: "ai",
    pattern: /\bnot only\b[^.]{0,80}\bbut also\b/gi,
    message: "Balanced “not only … but also” construction.",
    severity: "info",
  },
  {
    id: "negative-parallelism",
    category: "ai",
    pattern:
      /\b(?:(?:it'?s|it is|this is|that'?s|that is) not|(?:it|this|that) isn'?t)\s+(?:just |only |merely |simply )?[a-z][^.!?—\n]{2,60}[,;—-]\s*(?:it'?s|this is|that'?s|but)\b/gi,
    message:
      "Negative-parallelism construction (“it's not X, it's Y”) — one of the most recognizable AI tells.",
    severity: "warn",
  },
  {
    id: "crucial-role",
    category: "ai",
    pattern: /\bplays? an? (?:crucial|vital|pivotal|essential|key) role\b/gi,
    message: "Templated “plays a crucial role” phrasing.",
    severity: "info",
  },
  {
    id: "testament",
    category: "ai",
    pattern: /\b(?:is|stands as) a testament to\b/gi,
    message: "Formulaic “testament to” phrasing.",
    severity: "warn",
  },
  {
    id: "in-the-realm",
    category: "ai",
    pattern: /\bin the (?:realm|world) of\b/gi,
    message: "Vague “in the realm/world of” framing.",
    severity: "info",
  },
  {
    id: "when-it-comes-to",
    category: "ai",
    pattern: /\bwhen it comes to\b/gi,
    message: "Filler transition (“when it comes to”).",
    severity: "info",
  },
  {
    id: "end-of-the-day",
    category: "ai",
    pattern: /\bat the end of the day\b/gi,
    message: "Cliché closer (“at the end of the day”).",
    severity: "info",
  },
  {
    id: "power-of",
    category: "ai",
    pattern: /\b(?:harness|unlock) the (?:power|potential) of\b/gi,
    message: "Hype phrase (“harness/unlock the power of”).",
    severity: "warn",
  },
  {
    id: "bridge-the-gap",
    category: "ai",
    pattern: /\bbridge the gap\b/gi,
    message: "Cliché metaphor (“bridge the gap”).",
    severity: "info",
  },
  {
    id: "myriad-plethora",
    category: "ai",
    pattern: /\b(?:a myriad of|a plethora of)\b/gi,
    message: "Overwrought quantifier — “many” usually reads more human.",
    severity: "info",
  },
  {
    id: "meticulous-intricate",
    category: "ai",
    pattern: /\b(?:meticulously|intricate(?:ly)?|multifaceted)\b/gi,
    message: "Overused AI adjective.",
    severity: "info",
  },
  {
    id: "without-further-ado",
    category: "ai",
    pattern: /\b(?:without further ado|buckle up)\b/gi,
    message: "Templated hype opener.",
    severity: "warn",
  },
  {
    id: "rhetorical-question-opener",
    category: "ai",
    pattern: /^\s*have you ever wondered\b/gim,
    message: "Rhetorical-question opener reads as templated.",
    severity: "info",
  },
  {
    id: "em-dash-spam",
    category: "ai",
    pattern: /—/g,
    message: "Heavy em dash usage can feel machine-written.",
    severity: "info",
    minCount: ({ words }) => Math.max(6, words / 250),
  },
  {
    id: "double-space",
    category: "typography",
    pattern: /[^\s] {2,}[^\s]/g,
    message: "Extra spaces between words.",
    replacement: " ",
    autoFix: true,
    suggestion: "Auto-fix available",
    severity: "info",
  },
  {
    id: "trailing-space",
    category: "typography",
    pattern: /[ \t]+$/gm,
    message: "Trailing whitespace.",
    replacement: "",
    autoFix: true,
    suggestion: "Auto-fix available",
    severity: "info",
  },
];
