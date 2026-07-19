import type { Conversation, Message } from "./types";

// Marks: fix = red, tip = amber, tone = purple, gem = yellow highlight.
// All analysis is server-side AI stored on the message; this module reads it.
export type CoachKind = "fix" | "tip" | "tone" | "gem";

export interface CoachTip {
	kind: CoachKind;
	/** Character span in the message text the tip is anchored to. */
	start: number;
	end: number;
	title: string;
	detail: string;
	/** The flagged text itself. */
	quote: string;
	/** For fixes: what the span should read instead. */
	correction?: string;
}

// Absent = not analyzed yet, [] = analyzed and clean.
export function tipsForMessage(message: Pick<Message, "tips">): CoachTip[] {
	return message.tips ?? [];
}

export function rewriteForMessage(
	message: Pick<Message, "author" | "rewrite">,
): string | null {
	if (message.author !== "user") return null;
	return message.rewrite ?? null;
}

// Each sent message starts at 100 and loses points per mark, floored at 40:
// a rough message still communicated. The score is the average.
const MARK_PENALTY: Record<CoachKind, number> = {
	fix: 15,
	tone: 10,
	tip: 5,
	gem: 0,
};
const MESSAGE_FLOOR = 40;

export interface SessionInsights {
	/** Messages the learner sent. */
	sent: number;
	/** Sent messages that needed no fixes and no tone adjustments. */
	clean: number;
	/** Average message quality, 0-100; null when nothing was sent. */
	score: number | null;
	/** 0-100 share of sent messages whose tone matched the room. */
	toneMatch: number | null;
	/** Everything flagged on the learner's messages, worth practicing. */
	practice: CoachTip[];
	/** Phrases the partner used that are worth keeping. */
	gems: CoachTip[];
}

export function summarizeSession(conversation: Conversation): SessionInsights {
	let sent = 0;
	let clean = 0;
	let toneClean = 0;
	let qualitySum = 0;
	const practice: CoachTip[] = [];
	const gems: CoachTip[] = [];
	const seenPractice = new Set<string>();
	const seenGems = new Set<string>();

	for (const message of conversation.messages) {
		const tips = tipsForMessage(message);
		if (message.author === "user") {
			sent++;
			if (tips.length === 0) clean++;
			if (!tips.some((t) => t.kind === "tone")) toneClean++;
			qualitySum += Math.max(
				MESSAGE_FLOOR,
				tips.reduce((q, t) => q - MARK_PENALTY[t.kind], 100),
			);
			for (const tip of tips) {
				const key = `${tip.title}:${tip.quote.toLowerCase()}`;
				if (seenPractice.has(key)) continue;
				seenPractice.add(key);
				practice.push(tip);
			}
		} else {
			for (const tip of tips) {
				const key = tip.quote.toLowerCase();
				if (seenGems.has(key)) continue;
				seenGems.add(key);
				gems.push(tip);
			}
		}
	}

	return {
		sent,
		clean,
		score: sent === 0 ? null : Math.round(qualitySum / sent),
		toneMatch: sent === 0 ? null : Math.round((toneClean / sent) * 100),
		practice,
		gems,
	};
}
