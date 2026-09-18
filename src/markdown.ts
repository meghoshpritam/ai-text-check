export type Frontmatter = Record<string, unknown>;

export type ParsedDocument = {
  frontmatter: Frontmatter;
  body: string;
  rawFrontmatter: string | null;
};

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null" || trimmed === "~") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return unquote(trimmed);
}

function parseSimpleFrontmatter(block: string): Frontmatter {
  const data: Frontmatter = {};
  for (const line of block.split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2];
    if (!key) continue;
    data[key] = parseScalar(value ?? "");
  }
  return data;
}

export function parseDocument(raw: string): ParsedDocument {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: raw, rawFrontmatter: null };
  }
  return {
    frontmatter: parseSimpleFrontmatter(match[1] ?? ""),
    body: raw.slice(match[0].length),
    rawFrontmatter: match[0],
  };
}

/**
 * Splices a fixed body after the original frontmatter bytes.
 * Avoids re-serializing YAML so quote style and folding stay intact.
 */
export function serializeFixedDocument(raw: string, fixedBody: string): string {
  const match = raw.match(FRONTMATTER_RE);
  const nextBody = fixedBody.endsWith("\n") ? fixedBody : `${fixedBody}\n`;
  if (!match) return nextBody;

  const frontmatterBlock = match[0];
  const afterFrontmatter = raw.slice(frontmatterBlock.length);
  const separator = afterFrontmatter.match(/^\s*/)?.[0] ?? "";
  const next = `${frontmatterBlock}${separator}${nextBody.startsWith("\n") ? nextBody.slice(1) : nextBody}`;
  return next.endsWith("\n") ? next : `${next}\n`;
}

export function pathBasename(file: string): string {
  return (
    file
      .replace(/\.(mdx?|markdown|txt)$/i, "")
      .split(/[/\\]/)
      .pop() ?? file
  );
}
