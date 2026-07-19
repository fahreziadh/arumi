import { useAction } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Platform } from "./types";

export const MAX_FOLLOW_UPS = 3;
export const TOPIC_QUESTION = "What do you want to talk about?";
export const CUSTOM_KIND_QUESTION =
	"What kind of conversation is this? For example, a forum post or a text to a landlord.";

export interface PrepExchange {
	question: string;
	answer: string;
}

function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

// The pre-session interview. `wrap` lets the route apply state changes
// inside a view transition.
export function usePreparation(
	platform: Platform,
	basePlatformLabel: string,
	wrap: (apply: () => void) => void = (apply) => apply(),
) {
	const nextStep = useAction(api.prepare.next);

	const [customLabel, setCustomLabel] = useState<string | undefined>();
	const [exchanges, setExchanges] = useState<PrepExchange[]>([]);
	const [question, setQuestion] = useState<string | null>(
		platform === "custom" ? CUSTOM_KIND_QUESTION : TOPIC_QUESTION,
	);
	const [topic, setTopic] = useState("");
	const [partner, setPartner] = useState<{
		name: string;
		role: string;
	} | null>(null);
	const [done, setDone] = useState(false);
	const [thinking, setThinking] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState<{
		question: string;
		exchanges: PrepExchange[];
	} | null>(null);

	const platformLabel = customLabel ?? basePlatformLabel;

	const advance = async (
		askedQuestion: string,
		nextExchanges: PrepExchange[],
	) => {
		wrap(() => {
			setError(null);
			setPending({ question: askedQuestion, exchanges: nextExchanges });
			setExchanges(nextExchanges);
			setQuestion(null);
			setThinking(true);
		});

		try {
			const result = await nextStep({
				platform,
				platformLabel,
				exchanges: nextExchanges.filter(
					(e) => e.question !== CUSTOM_KIND_QUESTION,
				),
			});
			wrap(() => {
				setThinking(false);
				setPending(null);
				if (result.done) {
					setDone(true);
					setTopic(result.topic ?? "");
					setPartner(
						result.partnerName && result.partnerRole
							? { name: result.partnerName, role: result.partnerRole }
							: null,
					);
				} else {
					setQuestion(result.question ?? null);
				}
			});
		} catch (err) {
			wrap(() => {
				setThinking(false);
				setError(err instanceof Error ? err.message : "Something went wrong");
			});
		}
	};

	const answer = async (text: string) => {
		const trimmed = text.trim();
		if (!trimmed || done || thinking || question === null) return;

		// This step only names the custom room; the interview starts after it.
		if (question === CUSTOM_KIND_QUESTION) {
			wrap(() => {
				setCustomLabel(capitalize(trimmed));
				setExchanges((prev) => [
					...prev,
					{ question: CUSTOM_KIND_QUESTION, answer: trimmed },
				]);
				setQuestion(TOPIC_QUESTION);
			});
			return;
		}

		await advance(question, [...exchanges, { question, answer: trimmed }]);
	};

	const retry = async () => {
		if (!pending || thinking) return;
		await advance(pending.question, pending.exchanges);
	};

	const restart = () => {
		wrap(() => {
			setCustomLabel(undefined);
			setExchanges([]);
			setQuestion(
				platform === "custom" ? CUSTOM_KIND_QUESTION : TOPIC_QUESTION,
			);
			setTopic("");
			setPartner(null);
			setDone(false);
			setThinking(false);
			setError(null);
			setPending(null);
		});
	};

	const topicSteps = exchanges.filter(
		(e) => e.question !== CUSTOM_KIND_QUESTION,
	).length;

	return {
		question,
		thinking,
		done,
		topic,
		partner,
		error,
		platformLabel,
		stepCount: topicSteps + (done ? 0 : 1),
		answer,
		retry,
		restart,
	};
}
