import { describe, expect, it } from "vitest";
import {
	type CoachTip,
	rewriteForMessage,
	summarizeSession,
	tipsForMessage,
} from "./coach";
import type { Conversation } from "./types";

const fix: CoachTip = {
	kind: "fix",
	start: 0,
	end: 3,
	title: "Quick fix",
	detail: "Because.",
	quote: "idk",
	correction: "I'm not sure",
};

describe("tipsForMessage", () => {
	it("shows nothing until the AI coach has analyzed the message", () => {
		expect(tipsForMessage({ tips: undefined })).toEqual([]);
	});

	it("returns exactly the stored analysis, including analyzed-and-clean", () => {
		expect(tipsForMessage({ tips: [fix] })).toEqual([fix]);
		expect(tipsForMessage({ tips: [] })).toEqual([]);
	});
});

describe("rewriteForMessage", () => {
	it("only ever offers the AI's stored rewrite, for user messages", () => {
		expect(
			rewriteForMessage({ author: "user", rewrite: "Hello there." }),
		).toBe("Hello there.");
		expect(rewriteForMessage({ author: "user" })).toBeNull();
		expect(rewriteForMessage({ author: "persona", rewrite: "x" })).toBeNull();
	});
});

describe("summarizeSession score", () => {
	const message = (author: "user" | "persona", tips?: CoachTip[]) => ({
		id: "m",
		author,
		text: "x",
		at: 0,
		tips,
	});
	const conversation = (messages: ReturnType<typeof message>[]) =>
		({
			id: "c",
			platform: "whatsapp",
			platformLabel: "WhatsApp Chat",
			topic: "t",
			persona: { name: "Maya", role: "Friend" },
			createdAt: 0,
			messages,
		}) as Conversation;

	it("averages per-message quality with severity penalties", () => {
		const oneFix = [{ ...fix }];
		const { score } = summarizeSession(
			conversation([message("user", []), message("user", oneFix)]),
		);
		expect(score).toBe(Math.round((100 + 85) / 2));
	});

	it("floors a heavily marked message at 40", () => {
		const pileOn = Array.from({ length: 10 }, () => ({ ...fix }));
		const { score } = summarizeSession(conversation([message("user", pileOn)]));
		expect(score).toBe(40);
	});

	it("ignores unanalyzed messages' tips but still counts them as sent", () => {
		const { score, sent } = summarizeSession(
			conversation([message("user"), message("persona", [])]),
		);
		expect(sent).toBe(1);
		expect(score).toBe(100);
	});
});
