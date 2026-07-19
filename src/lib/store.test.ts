// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import type { PreparationResult } from "./preparation";
import {
	addPersonaReply,
	clearAllConversations,
	createConversation,
	deleteConversation,
	sendMessage,
} from "./store";
import type { AppState } from "./types";

const prep: PreparationResult = {
	platform: "slack",
	platformLabel: "Slack Discussion",
	topic: "Planning the next release",
};

function saved(): AppState {
	return JSON.parse(localStorage.getItem("arumi:v2") ?? "{}") as AppState;
}

afterEach(() => {
	clearAllConversations();
	localStorage.clear();
});

it("creates a conversation with a persona opener and persists it", () => {
	const id = createConversation(prep);
	const c = saved().conversations[id];
	expect(c.platform).toBe("slack");
	expect(c.topic).toBe(prep.topic);
	expect(c.messages).toHaveLength(1);
	expect(c.messages[0].author).toBe("persona");
	expect(c.messages[0].text).toContain("planning the next release");
});

it("appends user messages and persona replies based on the topic", () => {
	const id = createConversation(prep);
	sendMessage(id, "Can we ship on Friday?");
	addPersonaReply(id);
	const c = saved().conversations[id];
	expect(c.messages.map((m) => m.author)).toEqual([
		"persona",
		"user",
		"persona",
	]);
	expect(c.messages[2].text).toContain("planning the next release");
});

it("does not reply twice to the same user message", () => {
	const id = createConversation(prep);
	sendMessage(id, "Hello!");
	addPersonaReply(id);
	addPersonaReply(id);
	expect(saved().conversations[id].messages).toHaveLength(3);
});

it("ignores empty user messages", () => {
	const id = createConversation(prep);
	sendMessage(id, "   ");
	expect(saved().conversations[id].messages).toHaveLength(1);
});

it("deletes a conversation", () => {
	const id = createConversation(prep);
	deleteConversation(id);
	expect(saved().conversations[id]).toBeUndefined();
});
