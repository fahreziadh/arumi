// Persona identities per platform, used only when the prepare AI didn't
// pick the scenario's real counterpart.

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

export interface Persona {
	name: string;
	role: string;
}

export const personas: Record<Platform, Persona> = {
	email: { name: "Sarah Lin", role: "Project manager" },
	slack: { name: "Alex Chen", role: "Teammate" },
	github: { name: "mkovacs", role: "Maintainer" },
	whatsapp: { name: "Maya", role: "Friend" },
	telegram: { name: "Daniel", role: "Friend" },
	discord: { name: "pixelfox", role: "Community member" },
	teams: { name: "Priya Nair", role: "Colleague" },
	linkedin: { name: "Jordan Blake", role: "Recruiter" },
	support: { name: "Riley", role: "Support agent" },
	custom: { name: "Jamie", role: "Conversation partner" },
};
