export const reviewOutcomes = ["forgot", "remembered"] as const;

export type ReviewOutcome = (typeof reviewOutcomes)[number];

export function isReviewOutcome(value: string): value is ReviewOutcome {
  return reviewOutcomes.some((outcome) => outcome === value);
}
