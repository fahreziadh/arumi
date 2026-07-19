import type { CoachTip } from "./coach";

export type Platform =
	| "email"
	| "slack"
	| "github"
	| "whatsapp"
	| "telegram"
	| "discord"
	| "teams"
	| "linkedin"
	| "support"
	| "custom";

export type RoomKind = "chat" | "email" | "issue";

export interface UseCase {
	platform: Platform;
	label: string;
	hint: string;
}

export interface Persona {
	name: string;
	role: string;
}

export interface Message {
	id: string;
	author: "user" | "persona";
	text: string;
	at: number;
	/** AI coach analysis; absent until the server coach has run. */
	tips?: CoachTip[];
	/** AI full-message rewrite; null means "already natural". */
	rewrite?: string | null;
	/** Why coach analysis failed for this message, when it did. */
	tipsError?: string | null;
	/** True while the persona is still streaming this message. */
	streaming?: boolean;
}

export interface Conversation {
	id: string;
	platform: Platform;
	platformLabel: string;
	topic: string;
	persona: Persona;
	createdAt: number;
	messages: Message[];
	/** Why the last AI generation failed; rooms show this with a retry. */
	aiError?: string | null;
}

export interface AppState {
	conversations: Record<string, Conversation>;
}
