import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import type { Issue } from "../types.js";

type Assets = {
  words: Set<string>;
  trigrams: Set<string>;
  normalizationRanges: {
    slop_words: { min: number; max: number };
    slop_trigrams: { min: number; max: number };
    contrast: { min: number; max: number };
  };
};

const WEIGHT_WORD = 0.5;
const WEIGHT_PATTERN = 0.2;
const WEIGHT_TRIGRAM = 0.12;
const WEIGHT_TROPE = 0.18;
const WORD_MULTIPLIER = 1000;
const TRIGRAM_MULTIPLIER = 1000;

const CONTRAST_PATTERN =
  /\b(?:it(?:'s| is)|this is|that(?:'s| is)|(?:it|this|that) isn'?t)\s+(?:just |only |merely |simply )?[a-z][\s\S]{0,80}?\b(?:it(?:'s| is)|this is|that(?:'s| is)|but)\b/gi;
const NOT_BUT_PATTERN = /\bnot\b[\s\S]{0,60}?\bbut\b/gi;

const require = createRequire(import.meta.url);
const assetsDir = join(
  dirname(require.resolve("slop-detector/package.json")),
  "dist",
  "assets",
);

let cachedAssets: Assets | null = null;

function computeRange(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return { min: min - range * 0.1, max: max + range * 0.1 };
}

function loadAssets(): Assets {
  if (cachedAssets) return cachedAssets;

  const wordsRaw = JSON.parse(
    readFileSync(join(assetsDir, "slop_list.json"), "utf8"),
  ) as string[][];
  const trigramsRaw = JSON.parse(
    readFileSync(join(assetsDir, "slop_list_trigrams.json"), "utf8"),
  ) as string[][];
  const leaderboard = JSON.parse(
    readFileSync(join(assetsDir, "leaderboard_results.json"), "utf8"),
  ) as {
    results?: Array<{
      metrics?: {
        slop_list_matches_per_1k_words?: number;
        slop_trigram_matches_per_1k_words?: number;
        not_x_but_y_per_1k_chars?: number;
      };
    }>;
  };

  const words = new Set<string>();
  for (const item of wordsRaw) {
    if (Array.isArray(item) && item[0]) words.add(item[0].toLowerCase());
  }
  const trigrams = new Set<string>();
  for (const item of trigramsRaw) {
    if (Array.isArray(item) && item[0]) trigrams.add(item[0].toLowerCase());
  }

  const metrics = {
    slop_words: [] as number[],
    slop_trigrams: [] as number[],
    contrast: [] as number[],
  };
  for (const res of leaderboard.results ?? []) {
    if (!res.metrics) continue;
    metrics.slop_words.push(res.metrics.slop_list_matches_per_1k_words || 0);
    metrics.slop_trigrams.push(
      res.metrics.slop_trigram_matches_per_1k_words || 0,
    );
    metrics.contrast.push(res.metrics.not_x_but_y_per_1k_chars || 0);
  }

  cachedAssets = {
    words,
    trigrams,
    normalizationRanges: {
      slop_words: computeRange(metrics.slop_words),
      slop_trigrams: computeRange(metrics.slop_trigrams),
      contrast: computeRange(metrics.contrast),
    },
  };
  return cachedAssets;
}

function normalizeValue(
  value: number,
  range: { min: number; max: number },
): number {
  const normalized = (value - range.min) / (range.max - range.min);
  return Math.max(0, Math.min(1, normalized));
}

function toPlainText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]+`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_~>#-]+/g, " ");
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
}

function collectMatches(pattern: RegExp, text: string): string[] {
  return [...text.matchAll(pattern)].map((match) => match[0] ?? "");
}

export function runSlopDetector(text: string): Issue[] {
  if (!text.trim()) return [];

  const assets = loadAssets();
  const plain = toPlainText(text);
  const tokens = tokenize(plain);
  const nTokens = tokens.length || 1;

  let wordHitCount = 0;
  const wordHitMap = new Map<string, number>();
  for (const token of tokens) {
    if (!assets.words.has(token)) continue;
    wordHitCount++;
    wordHitMap.set(token, (wordHitMap.get(token) || 0) + 1);
  }

  let trigramHitCount = 0;
  if (tokens.length >= 3) {
    for (let i = 0; i < tokens.length - 2; i++) {
      const tg = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
      if (assets.trigrams.has(tg)) trigramHitCount++;
    }
  }

  const contrastMatches = [
    ...new Set([
      ...collectMatches(CONTRAST_PATTERN, plain),
      ...collectMatches(NOT_BUT_PATTERN, plain),
    ]),
  ];
  const emDashCount = (text.match(/—/g) ?? []).length;
  const tropeRate = (emDashCount / Math.max(plain.length, 1)) * 1000;
  const wordScore = (wordHitCount / nTokens) * WORD_MULTIPLIER;
  const trigramScore = (trigramHitCount / nTokens) * TRIGRAM_MULTIPLIER;
  const contrastScore =
    (contrastMatches.length / Math.max(plain.length, 1)) * 1000;

  const rawSlopScore =
    (normalizeValue(wordScore, assets.normalizationRanges.slop_words) *
      WEIGHT_WORD +
      normalizeValue(contrastScore, assets.normalizationRanges.contrast) *
        WEIGHT_PATTERN +
      normalizeValue(trigramScore, assets.normalizationRanges.slop_trigrams) *
        WEIGHT_TRIGRAM +
      normalizeValue(tropeRate, { min: 0, max: 5 }) * WEIGHT_TROPE) *
    100;
  const slopScore = Math.round(rawSlopScore * 10) / 10;

  const issues: Issue[] = [];

  if (slopScore >= 40) {
    issues.push({
      rule: "eqbench-slop-score",
      engine: "slop-detector",
      category: "ai",
      severity: slopScore >= 60 ? "warn" : "info",
      message: `EQBench SLOP score ${slopScore}/100 (higher = more AI-like).`,
      suggestion:
        slopScore >= 60
          ? "Rewrite stock phrasing and contrast constructions."
          : "Review flagged vocabulary and contrast patterns.",
    });
  }

  for (const [word, count] of [...wordHitMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)) {
    issues.push({
      rule: `eqbench-word-${word.replace(/\s+/g, "-")}`,
      engine: "slop-detector",
      category: "ai",
      severity: "info",
      message: `EQBench slop vocabulary: “${word}” (${count}×).`,
      match: word,
    });
  }

  for (const match of contrastMatches.slice(0, 5)) {
    issues.push({
      rule: "eqbench-contrast",
      engine: "slop-detector",
      category: "ai",
      severity: "info",
      message: `EQBench contrast pattern: “${match.trim()}”`,
      match,
    });
  }

  if (emDashCount >= 3) {
    issues.push({
      rule: "eqbench-trope-em-dash",
      engine: "slop-detector",
      category: "ai",
      severity: "info",
      message: `EQBench typography trope: ${emDashCount} em dash(es).`,
      match: "—",
    });
  }

  return issues;
}
