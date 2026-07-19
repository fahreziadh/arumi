import type { Platform } from "./types";

export interface PrepExchange {
	question: string;
	answer: string;
}

export interface PreparationState {
	platform: Platform;
	platformLabel: string;
	customLabel?: string;
	exchanges: PrepExchange[];
	question: string | null;
	followUpsAsked: number;
	done: boolean;
}

export interface PreparationResult {
	platform: Platform;
	platformLabel: string;
	topic: string;
}

export interface PreparationAdapter {
	begin(platform: Platform, platformLabel: string): PreparationState;
	answer(state: PreparationState, text: string): PreparationState;
	result(state: PreparationState): PreparationResult;
}

export const MAX_FOLLOW_UPS = 3;
export const TOPIC_QUESTION = "What do you want to talk about?";
export const CUSTOM_KIND_QUESTION =
	"What kind of conversation is this? For example, a forum post or a text to a landlord.";

const FOLLOW_UPS = [
	"Can you say a bit more? What's the situation, and who is involved?",
	"What outcome do you want from this conversation?",
	"Any specific detail you want to make sure comes up?",
];

const VAGUE =
	/\b(idk|dunno|not sure|anything|whatever|something|stuff|no idea)\b/i;

function isClear(text: string): boolean {
	const words = text.split(/\s+/).filter(Boolean);
	return words.length >= 6 && !VAGUE.test(text);
}

function topicAnswers(exchanges: PrepExchange[]): string[] {
	return exchanges
		.filter((e) => e.question !== CUSTOM_KIND_QUESTION)
		.map((e) => e.answer);
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export const localPreparation: PreparationAdapter = {
	begin(platform, platformLabel) {
		return {
			platform,
			platformLabel,
			exchanges: [],
			question: platform === "custom" ? CUSTOM_KIND_QUESTION : TOPIC_QUESTION,
			followUpsAsked: 0,
			done: false,
		};
	},

	answer(state, text) {
		const trimmed = text.trim();
		if (!trimmed || state.done || state.question === null) return state;
		const exchanges = [
			...state.exchanges,
			{ question: state.question, answer: trimmed },
		];

		if (state.question === CUSTOM_KIND_QUESTION) {
			return {
				...state,
				customLabel: capitalize(trimmed),
				exchanges,
				question: TOPIC_QUESTION,
			};
		}

		const combined = topicAnswers(exchanges).join(" ");
		if (isClear(combined) || state.followUpsAsked >= MAX_FOLLOW_UPS) {
			return { ...state, exchanges, question: null, done: true };
		}

		return {
			...state,
			exchanges,
			question: FOLLOW_UPS[state.followUpsAsked],
			followUpsAsked: state.followUpsAsked + 1,
		};
	},

	result(state) {
		return {
			platform: state.platform,
			platformLabel: state.customLabel ?? state.platformLabel,
			topic: capitalize(topicAnswers(state.exchanges).join(". ")),
		};
	},
};
