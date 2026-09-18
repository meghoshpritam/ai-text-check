import { describe, expect, it } from "vitest";
import {
  applyAutoFixes,
  checkText,
  serializeFixedDocument,
} from "../src/index.js";
import { parseDocument, pathBasename } from "../src/markdown.js";
import { analyzeReadability } from "../src/rules/readability.js";
import { analyzeFrontmatter } from "../src/rules/seo.js";
import { analyzeStructure } from "../src/rules/structure.js";
import { analyzeTypography } from "../src/rules/typography.js";
import { resolveConfig } from "../src/config.js";
import { onlyEngines } from "./helpers.js";

const polish = onlyEngines({ polish: true, slopGate: true });

describe("AI polish rules", () => {
  it("flags the remaining high-signal tells", () => {
    const report = checkText(
      [
        "Furthermore, leverage and utilize this ecosystem.",
        "Whether you are a founder, let's explore a comprehensive guide.",
        "In this article, we will unlock the power of the landscape.",
        "Not only is it fast but also cheap.",
        "This plays a crucial role and is a testament to the work.",
        "In the realm of search, when it comes to ranking, at the end of the day we bridge the gap.",
        "A myriad of meticulously chosen options, without further ado.",
        "Have you ever wondered about a plethora of ideas?",
      ].join("\n"),
      { format: "plain", config: { engines: polish } },
    );
    const rules = report.issues.map((issue) => issue.rule);
    expect(rules).toEqual(
      expect.arrayContaining([
        "furthermore-moreover",
        "leverage-utilize",
        "landscape-ecosystem",
        "whether-you-are",
        "lets-explore",
        "boilerplate-intro",
        "not-only-but-also",
        "crucial-role",
        "testament",
        "in-the-realm",
        "when-it-comes-to",
        "end-of-the-day",
        "power-of",
        "bridge-the-gap",
        "myriad-plethora",
        "meticulous-intricate",
        "without-further-ado",
        "rhetorical-question-opener",
      ]),
    );
  });

  it("honors ignoreRules", () => {
    const report = checkText("Please delve into the logs.", {
      format: "plain",
      config: { ignoreRules: ["dive-deep"], engines: polish },
    });
    expect(report.issues.some((issue) => issue.rule === "dive-deep")).toBe(
      false,
    );
  });

  it("skips polish AI tells when the polish engine is off", () => {
    const report = checkText("Please delve into the logs.", {
      format: "plain",
      config: { engines: onlyEngines() },
    });
    expect(report.enginesRun).toEqual([]);
    expect(report.issues).toEqual([]);
  });

  it("flags em-dash spam once the count is high enough", () => {
    const report = checkText(
      "Wait—one—two—three—four—five—six—seven extra words here.",
      {
        format: "plain",
        config: {
          checks: { typography: false },
          engines: onlyEngines({ polish: true }),
        },
      },
    );
    expect(report.issues.some((issue) => issue.rule === "em-dash-spam")).toBe(
      true,
    );
  });
});

describe("structure, SEO, readability, typography", () => {
  it("flags heading skips, multiple H1s, and moralizing endings", () => {
    const body = [
      "# One",
      "",
      "First paragraph of real content for the page.",
      "",
      "#### Skipped",
      "",
      "# Two",
      "",
      "Second paragraph of real content for the page.",
      "",
      "Ultimately this is what it comes down to for the reader.",
    ].join("\n");
    const issues = analyzeStructure(body);
    const rules = issues.map((issue) => issue.rule);
    expect(rules).toContain("heading-skip");
    expect(rules).toContain("multiple-h1");
    expect(rules).toContain("moralizing-conclusion");
  });

  it("flags numbered section titles and missing headings on long copy", () => {
    const numbered = analyzeStructure("# 1. Setup\n\nShort body.");
    expect(numbered.some((issue) => issue.rule === "numbered-sections")).toBe(
      true,
    );

    const long = `${"word ".repeat(450)}`;
    const issues = analyzeStructure(long);
    expect(issues.some((issue) => issue.rule === "missing-headings")).toBe(
      true,
    );
  });

  it("flags short, long, and marketing frontmatter", () => {
    const config = resolveConfig({});
    const short = analyzeFrontmatter(
      { title: "Hi", description: "tiny" },
      config,
    );
    expect(short.map((issue) => issue.rule)).toEqual(
      expect.arrayContaining([
        "short-title",
        "short-description",
        "missing-date",
      ]),
    );

    const long = analyzeFrontmatter(
      {
        title: "A".repeat(80),
        description: "B".repeat(200),
        date: "2026-01-01",
      },
      config,
    );
    expect(long.map((issue) => issue.rule)).toEqual(
      expect.arrayContaining(["long-title", "long-description"]),
    );

    const marketing = analyzeFrontmatter(
      {
        title: "Shipping Postgres ranking in production systems",
        description:
          "A comprehensive walkthrough of ranking changes that actually shipped to production readers this year.",
        date: "2026-01-01",
      },
      config,
    );
    expect(
      marketing.some((issue) => issue.rule === "marketing-description"),
    ).toBe(true);
  });

  it("flags long sentences, long paragraphs, and uniform openings", () => {
    const longSentence = `${"word ".repeat(40)}.`;
    const issues = analyzeReadability(longSentence, resolveConfig({}));
    expect(issues.map((issue) => issue.rule)).toEqual(
      expect.arrayContaining(["long-sentences", "very-long-sentence"]),
    );

    const longParagraph = analyzeReadability(
      `${"word ".repeat(130)}.`,
      resolveConfig({}),
    );
    expect(longParagraph.some((issue) => issue.rule === "long-paragraph")).toBe(
      true,
    );
  });

  it("flags typography tells and skips code when asked", () => {
    const issues = analyzeTypography("Wait—what? “Hello” …\u200B \u00A0");
    expect(issues.map((issue) => issue.rule)).toEqual(
      expect.arrayContaining([
        "ai-dashes",
        "smart-quotes",
        "unicode-ellipsis",
        "invisible-chars",
        "unicode-spaces",
      ]),
    );

    const skipped = analyzeTypography("```\nWait—what?\n```", {
      skipCode: true,
    });
    expect(skipped.some((issue) => issue.rule === "ai-dashes")).toBe(false);
  });

  it("flags passive voice, uniform rhythm, and missing links", () => {
    const passive = analyzeReadability(
      "The file was copied. The data was stored. The report was printed. The note was saved.",
      resolveConfig({ readability: { passiveRatio: 0.2 } }),
    );
    expect(passive.some((issue) => issue.rule === "passive-voice")).toBe(true);

    const uniform = analyzeReadability(
      [
        "The cats sat on the red mat here today.",
        "The dogs sat on the red mat here today.",
        "The birds sat on the red mat here today.",
        "The goats sat on the red mat here today.",
        "The hens sat on the red mat here today.",
        "The pigs sat on the red mat here today.",
        "The cows sat on the red mat here today.",
        "The sheep sat on the red mat here today.",
        "The ducks sat on the red mat here today.",
      ].join(" "),
      resolveConfig({}),
    );
    expect(
      uniform.some((issue) => issue.rule === "uniform-sentence-rhythm"),
    ).toBe(true);

    const openings = analyzeReadability(
      ["The one.", "", "The two.", "", "The three.", "", "The four."].join(
        "\n",
      ),
      resolveConfig({}),
    );
    expect(
      openings.some((issue) => issue.rule === "uniform-paragraph-starts"),
    ).toBe(true);
  });

  it("suggests human touches on long markdown without voice", () => {
    const body = [
      "---",
      "title: Shipping retrieval ranking without a vector store in production",
      "description: How we measured a forty percent accuracy gain after adding lexical fallback to Postgres ranking on the evaluation set.",
      "date: 2026-03-12",
      "---",
      "",
      "# Shipping retrieval ranking",
      "",
      `${"The system stored documents in Postgres and ranked them with lexical signals. ".repeat(30)}`,
    ].join("\n");
    const report = checkText(body, {
      format: "markdown",
      source: "post.md",
      config: {
        engines: onlyEngines({ polish: true }),
        checks: { ai: false, grammar: false, typography: false, seo: false },
      },
    });
    expect(report.issues.some((issue) => issue.rule === "no-voice")).toBe(true);
  });

  it("flags missing concrete detail and outbound links on long copy", () => {
    const body = [
      "---",
      "title: Shipping retrieval ranking without a vector store in production",
      "description: How we measured a forty percent accuracy gain after adding lexical fallback to Postgres ranking on the evaluation set.",
      "date: 2026-03-12",
      "---",
      "",
      "# Shipping retrieval ranking",
      "",
      `I ${"wrote notes about ranking and retrieval without citing a source. ".repeat(60)}`,
    ].join("\n");
    const report = checkText(body, {
      format: "markdown",
      source: "post.md",
      config: {
        engines: onlyEngines({ polish: true }),
        checks: { ai: false, grammar: false, typography: false, seo: false },
      },
    });
    expect(
      report.issues.some((issue) => issue.rule === "no-concrete-detail"),
    ).toBe(true);
    expect(report.issues.some((issue) => issue.rule === "no-links")).toBe(true);
  });
});

describe("auto-fix and markdown", () => {
  it("does not rewrite fenced code while fixing prose", () => {
    const fixed = applyAutoFixes(
      [
        "It's important to note that retries hide the bug.",
        "",
        "```",
        "It's important to note that this stays.",
        "```",
        "",
      ].join("\n"),
    );
    expect(fixed).toContain("Retries hide the bug.");
    expect(fixed).toContain("It's important to note that this stays.");
  });

  it("collapses extra spaces and trailing whitespace", () => {
    const fixed = applyAutoFixes("Hello  world.   \n");
    expect(fixed).toBe("Hello world.\n");
  });

  it("parses frontmatter scalars and serializes a fixed body", () => {
    const raw = [
      "---",
      "title: Hello",
      "draft: true",
      "count: 3",
      "empty: null",
      "# comment",
      "---",
      "",
      "Old body.",
      "",
    ].join("\n");
    const parsed = parseDocument(raw);
    expect(parsed.frontmatter.title).toBe("Hello");
    expect(parsed.frontmatter.draft).toBe(true);
    expect(parsed.frontmatter.count).toBe(3);
    expect(parsed.frontmatter.empty).toBeNull();

    const next = serializeFixedDocument(raw, "New body.");
    expect(next).toContain("title: Hello");
    expect(next).toContain("New body.");
    expect(next).not.toContain("Old body.");
  });

  it("serializes documents without frontmatter", () => {
    expect(serializeFixedDocument("Hi", "Bye")).toBe("Bye\n");
  });

  it("strips known extensions from the basename", () => {
    expect(pathBasename("/tmp/post.mdx")).toBe("post");
    expect(pathBasename("notes.markdown")).toBe("notes");
  });
});
