import type { CheckReport, CheckSummary, Issue } from "../types.js";

function formatIssue(issue: Issue): string {
  const location = issue.line ? `:${issue.line}` : "";
  const excerpt = issue.excerpt ? ` - "${issue.excerpt}"` : "";
  const rule = issue.engine ? `${issue.engine}/${issue.rule}` : issue.rule;
  return `  [${issue.severity}] ${rule}${location}: ${issue.message}${excerpt}`;
}

export function printReport(report: CheckReport, verbose: boolean): void {
  if (report.issues.length === 0) {
    if (verbose) {
      console.log(`✓ ${report.source} (${report.score}/100)`);
    }
    return;
  }

  console.log(`\n${report.source}`);
  console.log(`Score: ${report.score}/100 | ${report.stats.words} words`);
  for (const issue of report.issues) {
    console.log(formatIssue(issue));
  }
}

export function printSummary(summary: CheckSummary, fix: boolean): void {
  console.log("\n---");
  console.log(`Files checked: ${summary.filesChecked}`);
  console.log(`Files with issues: ${summary.filesWithIssues}`);
  console.log(`Average score: ${summary.averageScore.toFixed(1)}/100`);
  if (fix) {
    console.log(`Files auto-fixed: ${summary.filesFixed}`);
  }
  console.log(
    summary.failed
      ? "✗ Checks reported issues."
      : summary.filesWithIssues > 0
        ? "✓ No issues at the configured fail level."
        : "✓ All content checks passed.",
  );
}
