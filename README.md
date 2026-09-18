# ai-text-check

One-point checker for AI writing tells, grammar, and synthetic typography in any JavaScript or TypeScript project.

It runs the mepritam.dev content-quality stack together with Vale, slop-gate, write-good, retext, is-this-ai-slop, Veldica, and clean-writing-lint, then returns a single scored report. See [SOURCES.md](./SOURCES.md) for the file-by-file map.

## Install

```bash
npm install -D ai-text-check
```

Node.js 20+ is required. The package ships dual **ESM and CommonJS** builds with TypeScript types. Vale and slop-gate are regular dependencies, not optional peers.

## What it checks

| Engine              | What it catches                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **polish**          | Custom AI tells (`delve`, emojis, `in today's world`, antithesis), readability, markdown structure/SEO, typography |
| **slop-gate**       | Vocabulary pack (`nestled`, `treasure trove`, `leverage`, …)                                                       |
| **write-good**      | Weasel words, clichés, wordy phrases, passive voice                                                                |
| **retext**          | Passive voice, readability grade, simplify, repeated words                                                         |
| **is-this-ai-slop** | Clichés, buzzwords, em-dash spam, antithesis, sycophancy                                                           |
| **veldica**         | Stock LLM transitions and AI-style markers                                                                         |
| **clean-writing**   | Banned constructions, marketing adjectives, filler, intensifiers                                                   |
| **ai-slop-linter**  | Wikipedia _Signs of AI writing_ rules with line/column findings                                                    |
| **slop-detector**   | EQBench SLOP score (vocabulary, contrast patterns, trigrams, tropes)                                               |
| **prose-slop**      | Vocabulary, punctuation, and document-cadence tells (English)                                                      |
| **vale**            | Vendored styles: write-good, Google, AiTextCheck, ai-tells, signs-of-ai-writing                                    |

Safe auto-fixes can strip filler openers and collapse extra whitespace without rewriting code fences.

Emoji in prose is treated as an AI tell (`ai-emojis`). Set `ignoreEmojis: true` or pass `--ignore-emojis` to allow them; the ignore flag is off by default.

## TypeScript

```ts
import { checkText, defineConfig, personalizeText } from "ai-text-check";

const config = defineConfig({
  preset: "default",
  failOn: "warn",
  ignoreRules: ["leverage-utilize"],
  engines: { vale: true },
});

const report = checkText(draft, {
  format: "markdown",
  applyFixes: true,
  config,
});

if (report.score < 70) {
  console.error(report.issues);
}
```

## JavaScript (CJS or ESM)

```js
const { checkText, sanitizeText } = require("ai-text-check");

const report = checkText("In today's fast-paced world, we leverage synergy.");
console.log(report.score, report.issues, report.enginesRun);

const cleaned = sanitizeText("Wait—what? “Hello” …");
```

```js
import { checkText } from "ai-text-check";
```

## Node file API

```ts
import { checkFile, checkFiles, loadConfig } from "ai-text-check/node";

const config = await loadConfig();
const summary = checkFiles(["content", "README.md"], {
  config,
  writeFixes: true,
});

if (summary.failed) process.exit(1);
```

`loadConfig()` reads, in order:

1. `ai-text-check.config.json` / `.js` / `.mjs` / `.cjs`
2. `package.json` → `"ai-text-check"`

Unknown keys and invalid types fail with a validation error. Vale findings are merged into the same `issues` array (use `--no-vale` or `engines.vale: false` to skip).

## CLI

```bash
npx ai-text-check
npx ai-text-check content README.md
npx ai-text-check --fix --min-score 70 docs
npx ai-text-check --preset ai --json
npx ai-text-check --sanitize
npx ai-text-check --no-vale
npx ai-text-check init
```

| Flag                                    | Meaning                            |
| --------------------------------------- | ---------------------------------- |
| `--fix`                                 | Apply safe automatic fixes         |
| `--sanitize`                            | Normalize AI typography on disk    |
| `--json`                                | Machine-readable report            |
| `--fail-on error\|warn\|info`           | CI threshold (default `warn`)      |
| `--min-score N`                         | Fail if any file scores below N    |
| `--preset default\|strict\|ai\|grammar` | Rule pack                          |
| `--format auto\|plain\|markdown`        | Input format                       |
| `--no-vale`                             | Skip Vale                          |
| `--no-slop`                             | Skip slop-gate and is-this-ai-slop |
| `--no-write-good`                       | Skip write-good                    |
| `--no-retext`                           | Skip retext                        |
| `--ignore-emojis`                       | Allow emojis (skip `ai-emojis`)    |
| `--ignore-rule ID`                      | Skip a rule (repeatable)           |

Exit code `1` when issues meet the fail threshold.

## Config

`ai-text-check.config.json`:

```json
{
  "preset": "default",
  "failOn": "warn",
  "minScore": 0,
  "extensions": [".md", ".mdx", ".markdown", ".txt"],
  "ignoreRules": [],
  "ignoreEmojis": false,
  "checks": {
    "ai": true,
    "grammar": true,
    "readability": true,
    "structure": true,
    "seo": true,
    "typography": true
  },
  "engines": {
    "polish": true,
    "slopGate": true,
    "writeGood": true,
    "retext": true,
    "isThisAiSlop": true,
    "veldica": true,
    "cleanWriting": true,
    "aiSlopLinter": true,
    "slopDetector": true,
    "proseSlop": true,
    "vale": true
  }
}
```

Presets:

- `default`: every check and every engine
- `strict`: default plus extra slop-gate punctuation
- `ai`: AI tells + typography (polish, slop-gate, is-this-ai-slop, Veldica, clean-writing, ai-slop-linter, slop-detector, prose-slop, Vale)
- `grammar`: grammar + readability (write-good, retext, clean-writing, Vale)

## Scripts

```bash
npm run test
npm run lint
npm run typecheck
npm run format:check
npm run check
npm run build
```

## License

[MIT](./LICENSE) © 2026 Pritam Ghosh.

The checker itself, including the custom `AiTextCheck` Vale rules, is MIT. Vendored Vale styles keep their upstream licenses; see [NOTICE](./NOTICE).

`vale/styles/signs-of-ai-writing` is [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
