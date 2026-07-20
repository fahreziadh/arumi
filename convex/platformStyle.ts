/**
 * How long a persona's message should be, per kind of room. Stated in words
 * rather than as "keep it short", which a model reads as four paragraphs —
 * and length is the most obvious tell that a fake thread is fake.
 */

export type RoomKind = "chat" | "email" | "issue";

export function roomKindFor(platform: string): RoomKind {
	if (platform === "email") return "email";
	if (platform === "github") return "issue";
	return "chat";
}

export const LENGTH_RULE: Record<RoomKind, string> = {
	chat: [
		"LENGTH: keep it SHORT. One or two lines, about 30 words, and never more than 45.",
		"ALWAYS finish your thought. The message must be a complete, self-contained sentence that ends properly. Never stop mid-sentence, never trail off, and never leave the rest for a follow-up message: you are sending exactly one message and there is no next one.",
		"Being short means picking ONE small thing to say and saying it completely, not starting something big and cutting it off. Never write paragraphs and do not recap what was already said.",
	].join(" "),
	email:
		"LENGTH: a real email. A greeting, one to three short paragraphs, a sign-off. Say what needs saying and stop.",
	issue:
		"LENGTH: a focused comment, at most two short paragraphs. Technical and to the point.",
};
