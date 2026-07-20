import { describe, expect, it } from "vitest";
import { singleCorrection } from "../../convex/coachAi";
import { guessCategory } from "../../convex/coachCategories";
import { messageQuality } from "../../convex/coachScore";
import { currentStreak } from "../../convex/streak";

const days = (...keys: number[]) => new Set(keys);

describe("currentStreak", () => {
	it("counts back from today", () => {
		expect(currentStreak(days(10, 9, 8), 10)).toBe(3);
	});

	it("keeps the streak alive on a day with no practice yet", () => {
		expect(currentStreak(days(9, 8), 10)).toBe(2);
	});

	it("dies once a whole day has been skipped", () => {
		expect(currentStreak(days(8, 7), 10)).toBe(0);
	});

	it("ignores days on the far side of a gap", () => {
		expect(currentStreak(days(10, 9, 7, 6), 10)).toBe(2);
	});

	it("is zero with no activity at all", () => {
		expect(currentStreak(days(), 10)).toBe(0);
	});
});

describe("messageQuality", () => {
	it("is perfect for an unmarked message", () => {
		expect(messageQuality([])).toBe(100);
	});

	it("charges more for a fix than a tip", () => {
		expect(messageQuality([{ kind: "fix" }])).toBeLessThan(
			messageQuality([{ kind: "tip" }]),
		);
	});

	it("never falls below the floor", () => {
		const piled = Array.from({ length: 10 }, () => ({ kind: "fix" as const }));
		expect(messageQuality(piled)).toBe(40);
	});
});

describe("guessCategory", () => {
	it("maps tone marks to register without reading the title", () => {
		expect(guessCategory("tone", "Anything at all")).toBe("register");
	});

	it("reads the title when there is no better signal", () => {
		expect(guessCategory("fix", "Watch the apostrophe")).toBe("punctuation");
		expect(guessCategory("tip", "This phrase sounds unnatural")).toBe(
			"vocabulary",
		);
	});

	it("leaves a soft tip uncategorized rather than guessing wrong", () => {
		expect(guessCategory("tip", "Hmm")).toBeNull();
	});
});

describe("singleCorrection", () => {
	it("keeps a single replacement wording untouched", () => {
		expect(singleCorrection("Any ideas?")).toBe("Any ideas?");
	});

	it("keeps only the first when the model offers a menu", () => {
		expect(
			singleCorrection(
				"What are you in the mood for? / Any ideas? / What do you like?",
			),
		).toBe("What are you in the mood for?");
	});

	it("has nothing to swap in when there is no correction", () => {
		expect(singleCorrection(undefined)).toBeUndefined();
		expect(singleCorrection("   ")).toBeUndefined();
	});
});
