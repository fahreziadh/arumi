/**
 * How a marked message turns into a number. Lives outside src/ so the session
 * report and the profile page cannot disagree about the same writing.
 */

export type ScoredKind = "fix" | "tip" | "tone" | "gem";

const PERFECT_MESSAGE = 100;

export const MARK_PENALTY: Record<ScoredKind, number> = {
	fix: 15,
	tone: 10,
	tip: 5,
	gem: 0,
};

/** A rough message still communicated, so no pile of marks scores below this. */
export const MESSAGE_FLOOR = 40;

export function messageQuality(tips: Array<{ kind: ScoredKind }>): number {
	return Math.max(
		MESSAGE_FLOOR,
		tips.reduce(
			(quality, tip) => quality - MARK_PENALTY[tip.kind],
			PERFECT_MESSAGE,
		),
	);
}
