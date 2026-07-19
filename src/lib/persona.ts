import type { Conversation, Persona, Platform } from "./types";

export interface PersonaAdapter {
	persona(platform: Platform): Persona;
	opener(platform: Platform, topic: string): string;
	reply(conversation: Conversation, userText: string): string;
}

const personas: Record<Platform, Persona> = {
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

function snippet(topic: string): string {
	const words = topic.split(/\s+/).filter(Boolean);
	const short = words.slice(0, 10).join(" ");
	const trimmed = short.replace(/[.,;:!?]+$/, "");
	return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export const localPersona: PersonaAdapter = {
	persona(platform) {
		return personas[platform];
	},

	opener(platform, topic) {
		const t = snippet(topic);
		switch (platform) {
			case "email":
				return `Hi,\n\nThanks for your email about ${t}. Could you walk me through the details?\n\nBest,\n${personas.email.name}`;
			case "github":
				return `Thanks for opening this issue. Can you share more context about ${t}: steps to reproduce, or what you expected to happen?`;
			case "linkedin":
				return `Hi, thanks for connecting. I saw your note about ${t}. I'd love to hear more.`;
			case "support":
				return `Hi! Thanks for reaching out about ${t}. Could you describe what happened?`;
			case "slack":
			case "teams":
				return `Hey! Saw your message about ${t}. What's on your mind?`;
			default:
				return `Hey! You wanted to talk about ${t}, right? Tell me more.`;
		}
	},

	reply(conversation, userText) {
		const t = snippet(conversation.topic);
		const templates = [
			`Got it. What's the most important part of ${t} for you?`,
			"That makes sense. How did that come about?",
			"Interesting. Could you give me an example?",
			"Okay. What would you like to happen next?",
			`Thanks for explaining. Is there anything else I should know about ${t}?`,
		];
		const turn = conversation.messages.filter(
			(m) => m.author === "persona",
		).length;
		const base = templates[Math.max(0, turn - 1) % templates.length];
		return userText.includes("?")
			? `Good question. I'd need to think about that, but here's my take: it depends on the details. ${base}`
			: base;
	},
};

export function typingDelay(text: string): number {
	return Math.min(700 + text.length * 15, 2500);
}
