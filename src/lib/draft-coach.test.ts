import { describe, expect, it } from "vitest";
import { isCoachOwnWording } from "./use-draft-coach";

describe("isCoachOwnWording", () => {
	it("recognises the rewrite the learner just adopted", () => {
		expect(
			isCoachOwnWording(
				"Want to grab food somewhere?",
				"Want to grab food somewhere?",
			),
		).toBe(true);
	});

	it("ignores surrounding whitespace on either side", () => {
		expect(isCoachOwnWording("  Let's grab food  ", "Let's grab food")).toBe(
			true,
		);
	});

	it("hands the draft back to the coach once it is edited", () => {
		expect(
			isCoachOwnWording(
				"Want to grab food somewhere tonight?",
				"Want to grab food somewhere?",
			),
		).toBe(false);
	});

	it("reviews normally when nothing was adopted", () => {
		expect(isCoachOwnWording("Can we go eat something?", null)).toBe(false);
	});
});
