import { useSyncExternalStore } from "react";
import { localPersona } from "./persona";
import type { PreparationResult } from "./preparation";
import type { AppState, Conversation, Message } from "./types";

const STORAGE_KEY = "arumi:v2";

let idCounter = 0;
export function uid(prefix: string): string {
	idCounter += 1;
	return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}

function load(): AppState {
	if (typeof localStorage === "undefined") return { conversations: {} };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { conversations: {} };
		const parsed = JSON.parse(raw) as AppState;
		if (!parsed || typeof parsed.conversations !== "object")
			return { conversations: {} };
		return parsed;
	} catch {
		return { conversations: {} };
	}
}

let state: AppState = load();
const listeners = new Set<() => void>();

function persist() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch {
		// Storage full or unavailable; the conversation still works in memory.
	}
}

function setState(updater: (prev: AppState) => AppState) {
	state = updater(state);
	persist();
	for (const l of listeners) l();
}

export function useAppState(): AppState {
	return useSyncExternalStore(
		(cb) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		},
		() => state,
		() => state,
	);
}

function updateConversation(
	id: string,
	fn: (c: Conversation) => Conversation,
): void {
	setState((prev) => {
		const conversation = prev.conversations[id];
		if (!conversation) return prev;
		return {
			...prev,
			conversations: { ...prev.conversations, [id]: fn(conversation) },
		};
	});
}

export function createConversation(prep: PreparationResult): string {
	const id = uid("c");
	const now = Date.now();
	const persona = localPersona.persona(prep.platform);
	const conversation: Conversation = {
		id,
		platform: prep.platform,
		platformLabel: prep.platformLabel,
		topic: prep.topic,
		persona,
		createdAt: now,
		messages: [
			{
				id: uid("m"),
				author: "persona",
				text: localPersona.opener(prep.platform, prep.topic),
				at: now,
			},
		],
	};
	setState((prev) => ({
		...prev,
		conversations: { ...prev.conversations, [id]: conversation },
	}));
	return id;
}

export function sendMessage(conversationId: string, text: string): void {
	const trimmed = text.trim();
	if (!trimmed) return;
	updateConversation(conversationId, (c) => ({
		...c,
		messages: [
			...c.messages,
			{ id: uid("m"), author: "user", text: trimmed, at: Date.now() },
		],
	}));
}

export function addPersonaReply(conversationId: string): void {
	updateConversation(conversationId, (c) => {
		const last = c.messages[c.messages.length - 1];
		if (!last || last.author !== "user") return c;
		const reply: Message = {
			id: uid("m"),
			author: "persona",
			text: localPersona.reply(c, last.text),
			at: Date.now(),
		};
		return { ...c, messages: [...c.messages, reply] };
	});
}

export function deleteConversation(conversationId: string): void {
	setState((prev) => {
		const { [conversationId]: _removed, ...rest } = prev.conversations;
		return { ...prev, conversations: rest };
	});
}

export function clearAllConversations(): void {
	setState(() => ({ conversations: {} }));
}
