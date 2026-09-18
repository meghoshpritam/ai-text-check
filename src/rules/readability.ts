import type { Issue, ResolvedConfig } from "../types.js";
import { countWords, splitParagraphs, splitSentences } from "../scan.js";

const PASSIVE_VOICE =
  /\b(?:is|are|was|were|be|been|being)\s+\w+ed\b|\b(?:is|are|was|were)\s+(?:being\s+)?\w+ed\b/gi;

export function countPassiveVoice(body: string): number {
  return (body.match(PASSIVE_VOICE) || []).length;
}

export function analyzeReadability(
  body: string,
  config: ResolvedConfig,
): Issue[] {
  const issues: Issue[] = [];
  const sentences = splitSentences(body);
  const paragraphs = splitParagraphs(body);
  const words = countWords(body);
  if (sentences.length === 0) return issues;

  const avgSentenceLength = words / sentences.length;
  if (avgSentenceLength > config.readability.avgSentenceWarn) {
    issues.push({
      rule: "long-sentences",
      category: "readability",
      severity: "warn",
      message: `Average sentence length is ${avgSentenceLength.toFixed(1)} words. Aim for under ${config.readability.avgSentenceWarn} for easier scanning.`,
    });
  }

  const longSentences = sentences.filter(
    (sentence) =>
      sentence.split(/\s+/).length > config.readability.longSentenceWords,
  );
  if (longSentences.length > 0) {
    const issue: Issue = {
      rule: "very-long-sentence",
      category: "readability",
      severity: "warn",
      message: `${longSentences.length} sentence(s) exceed ${config.readability.longSentenceWords} words. Split them.`,
    };
    const excerpt = longSentences[0]?.slice(0, 120);
    if (excerpt) issue.excerpt = excerpt;
    issues.push(issue);
  }

  const longParagraphs = paragraphs.filter((paragraph) => {
    const trimmed = paragraph.trim();
    if (
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ") ||
      /^\d+\.\s/.test(trimmed)
    ) {
      return false;
    }
    return countWords(paragraph) > config.readability.longParagraphWords;
  });
  if (longParagraphs.length > 0) {
    issues.push({
      rule: "long-paragraph",
      category: "readability",
      severity: "warn",
      message: `${longParagraphs.length} paragraph(s) exceed ${config.readability.longParagraphWords} words. Break them up.`,
    });
  }

  const passiveHits = countPassiveVoice(body);
  const passiveRatio = passiveHits / Math.max(sentences.length, 1);
  if (passiveRatio > config.readability.passiveRatio) {
    issues.push({
      rule: "passive-voice",
      category: "grammar",
      severity: "info",
      message: `Possible passive voice in ~${Math.round(passiveRatio * 100)}% of sentences. Prefer direct verbs where you can.`,
    });
  }

  const uniformStarts = paragraphs.filter((paragraph) =>
    /^(?:The|This|It|There|These|Those|When|If|In)\b/.test(paragraph),
  );
  if (
    uniformStarts.length / paragraphs.length > 0.6 &&
    paragraphs.length >= 4
  ) {
    issues.push({
      rule: "uniform-paragraph-starts",
      category: "readability",
      severity: "info",
      message:
        "Many paragraphs start the same way. Vary openings with a concrete detail, question, or verb.",
    });
  }

  if (sentences.length >= 8) {
    const lengths = sentences.map(
      (sentence) => sentence.split(/\s+/).filter(Boolean).length,
    );
    const mean =
      lengths.reduce((sum, value) => sum + value, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      lengths.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    if (coefficientOfVariation < 0.3 && mean > 8) {
      issues.push({
        rule: "uniform-sentence-rhythm",
        category: "readability",
        severity: "info",
        message: `Sentence lengths are unusually uniform (avg ${mean.toFixed(1)} words, low variance). Mix short and long sentences for a more natural rhythm.`,
      });
    }
  }

  return issues;
}

export function suggestHumanTouches(body: string): Issue[] {
  const issues: Issue[] = [];
  const words = countWords(body);
  const firstPerson = /\b(I|we|my|our)\b/i.test(body);
  const concreteDetail =
    /\b\d{4}\b|\b\d+(\.\d+)?%|\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/i.test(
      body,
    );

  if (!firstPerson && words > 250) {
    issues.push({
      rule: "no-voice",
      category: "readability",
      severity: "info",
      message:
        "No first-person voice detected. A short “I did X because Y” line often reads more credible than textbook tone.",
    });
  }

  if (!concreteDetail && words > 400) {
    issues.push({
      rule: "no-concrete-detail",
      category: "readability",
      severity: "info",
      message:
        "Few concrete details (dates, numbers, names). Specifics make technical writing feel lived-in.",
    });
  }

  const linkCount = (body.match(/\[([^\]]+)\]\(([^)]+)\)/g) || []).length;
  if (linkCount === 0 && words > 500) {
    issues.push({
      rule: "no-links",
      category: "readability",
      severity: "info",
      message:
        "No outbound links. Citing sources and tools helps readers and discoverability.",
    });
  }

  return issues;
}
