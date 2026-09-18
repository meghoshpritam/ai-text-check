declare module "clean-writing-lint" {
  export type CleanWritingViolation = {
    rule: string;
    severity: "error" | "warn" | "off";
    line: number;
    column: number;
    index: number;
    length: number;
    message: string;
  };

  export function lint(
    raw: string,
    userConfig?: Record<string, unknown>,
  ): {
    violations: CleanWritingViolation[];
  };
}
