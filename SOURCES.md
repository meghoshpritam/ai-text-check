# Rule sources

The default checker combines the mepritam.dev content-quality stack with extra
local, deterministic packages. Nothing here calls a hosted detector or needs an
API key. Vale (`@vvago/vale`) is the prose engine the user referred to as Vale
(sometimes heard as “VILE”).

| Library piece                                                                          | Source                                                                                                   |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Custom AI tells, auto-fixes, readability, structure, SEO                               | `mepritam-revamp-26/scripts/lib/content-polish.ts`                                                       |
| Special-character sanitizer                                                            | `mepritam-revamp-26/lib/sanitize-special-chars.ts`                                                       |
| `personalizeText()`                                                                    | `mepritam-revamp-26/lib/personalize-text.ts`                                                             |
| slop-gate vocabulary / punctuation JSON                                                | `slop-gate` 0.4.3 packs copied from mepritam; CLI from `slop-gate`                                       |
| Vale styles (`write-good`, `ai-tells`, `signs-of-ai-writing`, `Google`, `AiTextCheck`) | `mepritam-revamp-26/.vale/styles`                                                                        |
| Vale runner                                                                            | `@vvago/vale` native binary + bundled `vale/vale.ini`                                                    |
| write-good                                                                             | `write-good` npm (same So/ThereIs disables as `.vale.ini`)                                               |
| retext                                                                                 | `retext-english` + `retext-passive` + `retext-readability` + `retext-simplify` + `retext-repeated-words` |
| is-this-ai-slop                                                                        | `is-this-ai-slop` (`analyze()`)                                                                          |
| Veldica AI markers                                                                     | `@veldica/prose-linter` (`inventoryMarkers()`)                                                           |
| Clean Writing / STE subset                                                             | `clean-writing-lint` (`lint()`), with contraction and 20-word sentence rules off                         |
| ai-slop-linter                                                                         | `ai-slop-linter` (`lintText()`) — Wikipedia Signs of AI writing                                          |
| slop-detector (EQBench)                                                                | `slop-detector` scoring assets + sync adapter (`runSlopDetector`)                                        |
| prose-slop                                                                             | `prose-slop` (`check()`) — EN vocabulary / cadence                                                       |

Skipped after research (not a fit for Node 20 in-process checks):

- `slopsift` / WritingLint — requires Node 24+
- `slopless` — textlint-only, async, Node ≥22.13
- `wsc-lint` / `tacheles` — CLI-only, no stable in-process API
- `smellcheck` (npm) — agent skill / Markdown rules only; does not scan text
- `llm-slop-detector` — VS Code–centric, awkward as a library dependency
- Hosted classifiers (GPTZero, Originality, etc.) — need secrets / upload text

Default `checkFiles` order: polish + slop-gate JSON + write-good + retext +
is-this-ai-slop + Veldica + clean-writing + ai-slop-linter + slop-detector +
prose-slop, then Vale JSON merged onto the same report.

Licenses for this package and the vendored Vale styles are in [LICENSE](./LICENSE)
and [NOTICE](./NOTICE).
