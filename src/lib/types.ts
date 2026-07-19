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
}

export interface Conversation {
	id: string;
	platform: Platform;
	platformLabel: string;
	topic: string;
	persona: Persona;
	createdAt: number;
	messages: Message[];
}

export interface AppState {
	conversations: Record<string, Conversation>;
}
