import { expect, it } from "vitest";
import {
	CUSTOM_KIND_QUESTION,
	localPreparation,
	MAX_FOLLOW_UPS,
	TOPIC_QUESTION,
} from "./preparation";

const begin = () => localPreparation.begin("slack", "Slack Discussion");

it("starts by asking what to talk about", () => {
	expect(begin().question).toBe(TOPIC_QUESTION);
});

it("finishes without follow-ups when the first answer is clear", () => {
	const s = localPreparation.answer(
		begin(),
		"I want to plan the next release with my team",
	);
	expect(s.done).toBe(true);
	expect(s.followUpsAsked).toBe(0);
	expect(s.question).toBeNull();
	expect(localPreparation.result(s).topic).toBe(
		"I want to plan the next release with my team",
	);
});

it("asks a follow-up when the answer is vague, and finishes once it is clear", () => {
	let s = localPreparation.answer(begin(), "salary raise");
	expect(s.done).toBe(false);
	expect(s.followUpsAsked).toBe(1);
	expect(s.question).not.toBeNull();

	s = localPreparation.answer(
		s,
		"I want to ask my manager for a raise next week",
	);
	expect(s.done).toBe(true);
	expect(localPreparation.result(s).topic).toBe(
		"Salary raise. I want to ask my manager for a raise next week",
	);
});

it("asks at most three follow-ups even if answers stay vague", () => {
	let s = begin();
	for (const answer of ["idk", "stuff", "not sure", "whatever"]) {
		expect(s.done).toBe(false);
		s = localPreparation.answer(s, answer);
	}
	expect(s.followUpsAsked).toBe(MAX_FOLLOW_UPS);
	expect(s.done).toBe(true);
});

it("supports a custom use case by asking for the kind first", () => {
	let s = localPreparation.begin("custom", "Something Else");
	expect(s.question).toBe(CUSTOM_KIND_QUESTION);

	s = localPreparation.answer(s, "a forum post");
	expect(s.question).toBe(TOPIC_QUESTION);

	s = localPreparation.answer(
		s,
		"asking for advice about moving to Berlin for work",
	);
	expect(s.done).toBe(true);
	const result = localPreparation.result(s);
	expect(result.platformLabel).toBe("A forum post");
	expect(result.platform).toBe("custom");
	expect(result.topic).toBe(
		"Asking for advice about moving to Berlin for work",
	);
});

it("ignores empty answers", () => {
	const s = begin();
	expect(localPreparation.answer(s, "   ")).toBe(s);
});
