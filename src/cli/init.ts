import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

export function packageVersion(): string {
  let current = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
        name?: string;
        version?: string;
      };
      if (pkg.name === "ai-text-check" && pkg.version) return pkg.version;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return require("../../package.json").version as string;
}

function findPackageRoot(): string {
  let current = path.dirname(fileURLToPath(import.meta.url));
  while (true) {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
        name?: string;
      };
      if (pkg.name === "ai-text-check") return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

const SAMPLE_CONFIG = `{
  "preset": "default",
  "failOn": "warn",
  "minScore": 0,
  "extensions": [".md", ".mdx", ".markdown", ".txt"],
  "ignoreRules": []
}
`;

export function initProject(cwd: string, withVale: boolean): void {
  const configPath = path.join(cwd, "ai-text-check.config.json");
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, SAMPLE_CONFIG, "utf8");
    console.log(`Wrote ${path.relative(cwd, configPath)}`);
  } else {
    console.log("ai-text-check.config.json already exists.");
  }

  const destSlop = path.join(cwd, "slop-gate.config.json");
  const sourceSlop = path.join(findPackageRoot(), "slop-gate.config.json");
  if (fs.existsSync(sourceSlop) && !fs.existsSync(destSlop)) {
    fs.copyFileSync(sourceSlop, destSlop);
    console.log("Wrote slop-gate.config.json");
  }

  if (!withVale) return;

  const destIni = path.join(cwd, ".vale.ini");
  const sourceIni = path.join(findPackageRoot(), "vale", "vale.ini");
  if (!fs.existsSync(destIni) && fs.existsSync(sourceIni)) {
    const bundled = fs.readFileSync(sourceIni, "utf8");
    fs.writeFileSync(
      destIni,
      bundled.replace("StylesPath = styles", "StylesPath = .vale/styles"),
      "utf8",
    );
    console.log("Wrote .vale.ini");
  }

  const stylesSrc = path.join(findPackageRoot(), "vale", "styles");
  const stylesDest = path.join(cwd, ".vale", "styles");
  if (fs.existsSync(stylesSrc)) {
    copyDir(stylesSrc, stylesDest);
    console.log("Copied Vale styles to .vale/styles");
  }
}
