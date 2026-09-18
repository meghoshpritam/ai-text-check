import { describe, expect, it } from "vitest";
import { personalizeText } from "../src/index.js";

describe("personalizeText", () => {
  it("strips slop-gate vocabulary with a safe substitute", () => {
    const next = personalizeText("Please delve into the logs.");
    expect(next.toLowerCase()).not.toContain("delve");
    expect(next.toLowerCase()).toContain("look at");
  });

  it("replaces em dashes from the punctuation pack", () => {
    const next = personalizeText("Wait—what happened?");
    expect(next).not.toContain("—");
    expect(next).toContain("-");
  });

  it("flattens markdown to plain text before rewriting", () => {
    const next = personalizeText(
      "# Title\n\nPlease **delve** into the [logs](https://example.com).",
    );
    expect(next.toLowerCase()).not.toContain("delve");
    expect(next).toContain("Title");
    expect(next).toContain("https://example.com");
  });
});
