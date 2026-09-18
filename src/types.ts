export type Severity = "error" | "warn" | "info";

export type Category =
  "ai" | "grammar" | "readability" | "structure" | "seo" | "typography";

export type EngineName =
  | "polish"
  | "slop-gate"
  | "write-good"
  | "retext"
  | "is-this-ai-slop"
  | "veldica"
  | "clean-writing"
  | "vale";

export type TextFormat = "auto" | "plain" | "markdown";

export type PresetName = "default" | "strict" | "ai" | "grammar";

export type CheckName =
  "ai" | "grammar" | "readability" | "structure" | "seo" | "typography";

export type Issue = {
  rule: string;
  category: Category;
  severity: Severity;
  message: string;
  engine?: EngineName;
  line?: number;
  column?: number;
  excerpt?: string;
  suggestion?: string;
  match?: string;
};

export type TextStats = {
  words: number;
  sentences: number;
  paragraphs: number;
  avgSentenceLength: number;
  avgParagraphLength: number;
  passiveVoiceHits: number;
  aiPatternHits: number;
  fleschReadingEase: number;
  titleLength: number;
  descriptionLength: number;
};

export type CheckReport = {
  source: string;
  title: string;
  format: Exclude<TextFormat, "auto">;
  score: number;
  issues: Issue[];
  stats: TextStats;
  enginesRun: EngineName[];
  fixedText?: string;
};

export type CheckSummary = {
  reports: CheckReport[];
  filesChecked: number;
  filesWithIssues: number;
  filesFixed: number;
  averageScore: number;
  failed: boolean;
};

export type ChecksConfig = {
  ai?: boolean;
  grammar?: boolean;
  readability?: boolean;
  structure?: boolean;
  seo?: boolean;
  typography?: boolean;
};

export type EnginesConfig = {
  polish?: boolean;
  slopGate?: boolean;
  writeGood?: boolean;
  retext?: boolean;
  isThisAiSlop?: boolean;
  veldica?: boolean;
  cleanWriting?: boolean;
  vale?: boolean;
};

export type MarkdownConfig = {
  skipCode?: boolean;
  skipFrontmatter?: boolean;
  skipHtml?: boolean;
  skipTables?: boolean;
};

export type SeoThresholds = {
  titleMin?: number;
  titleMax?: number;
  descriptionMin?: number;
  descriptionMax?: number;
};

export type ReadabilityThresholds = {
  avgSentenceWarn?: number;
  longSentenceWords?: number;
  longParagraphWords?: number;
  passiveRatio?: number;
};

export type UserConfig = {
  preset?: PresetName;
  checks?: ChecksConfig;
  engines?: EnginesConfig;
  format?: TextFormat;
  failOn?: Severity;
  minScore?: number;
  ignoreRules?: string[];
  /** When true, skip the ai-emojis rule. Default false (emojis are flagged). */
  ignoreEmojis?: boolean;
  include?: string[];
  exclude?: string[];
  extensions?: string[];
  markdown?: MarkdownConfig;
  seo?: SeoThresholds;
  readability?: ReadabilityThresholds;
};

export type ResolvedConfig = {
  preset: PresetName;
  checks: Required<ChecksConfig>;
  engines: Required<EnginesConfig>;
  format: TextFormat;
  failOn: Severity;
  minScore: number;
  ignoreRules: string[];
  ignoreEmojis: boolean;
  include: string[];
  exclude: string[];
  extensions: string[];
  markdown: Required<MarkdownConfig>;
  seo: Required<SeoThresholds>;
  readability: Required<ReadabilityThresholds>;
};

export type CheckOptions = {
  source?: string;
  format?: TextFormat;
  applyFixes?: boolean;
  config?: UserConfig;
};

export type SanitizeOptions = {
  dashes?: boolean;
  smartQuotes?: boolean;
  ellipses?: boolean;
  invisibleChars?: boolean;
  spaces?: boolean;
  lineStartBullets?: boolean;
};

export type ReplacementStats = {
  dashes: number;
  smartQuotes: number;
  ellipses: number;
  invisibleChars: number;
  spaces: number;
  lineStartBullets: number;
  total: number;
};

export type ClauseReplacer = (substring: string, ...groups: string[]) => string;

export type PatternRule = {
  id: string;
  category: Category;
  pattern: RegExp;
  message: string;
  severity?: Severity;
  suggestion?: string;
  replacement?: string | ClauseReplacer;
  autoFix?: boolean;
  minCount?: number | ((ctx: { words: number }) => number);
};
