import { describe, expect, it } from "vitest";

import { isReviewOutcome } from "./index";

describe("isReviewOutcome", () => {
  it("accepts only the two honest review outcomes", () => {
    expect(isReviewOutcome("forgot")).toBe(true);
    expect(isReviewOutcome("remembered")).toBe(true);
    expect(isReviewOutcome("hard")).toBe(false);
  });
});
