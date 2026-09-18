import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      index: "src/index.ts",
      node: "src/node/index.ts",
    },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    target: "node20",
    platform: "neutral",
    noExternal: [
      "retext-english",
      "retext-passive",
      "retext-readability",
      "retext-repeated-words",
      "retext-simplify",
      "retext-stringify",
      "unified",
      "@veldica/prose-linter",
      "clean-writing-lint",
    ],
  },
  {
    entry: {
      cli: "src/cli/index.ts",
    },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    splitting: false,
    target: "node20",
    platform: "node",
    noExternal: [
      "retext-english",
      "retext-passive",
      "retext-readability",
      "retext-repeated-words",
      "retext-simplify",
      "retext-stringify",
      "unified",
      "@veldica/prose-linter",
      "clean-writing-lint",
    ],
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
