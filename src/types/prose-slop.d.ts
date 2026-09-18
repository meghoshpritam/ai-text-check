declare module "prose-slop" {
  export function check(
    text: string,
    options?: {
      lang?: string;
      format?: "markdown" | "plain";
      filename?: string;
      disable?: string[];
    },
  ): Array<{
    ruleId: string;
    severity: string;
    message: string;
    match: string;
    index: number;
    line: number;
    column: number;
    fixable: boolean;
  }>;
}
