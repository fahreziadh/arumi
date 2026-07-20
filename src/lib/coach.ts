import { messageQuality } from "../../convex/coachScore";
import type { Conversation, Message } from "./types";

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

/** Absent = not analyzed yet, [] = analyzed and clean. */
export function tipsForMessage(message: Pick<Message, "tips">): CoachTip[] {
	return message.tips ?? [];
}

export function rewriteForMessage(
	message: Pick<Message, "author" | "rewrite">,
): string | null {
	if (message.author !== "user") return null;
	return message.rewrite ?? null;
}

/**
 * Live-coach tips, mapped from the trimmed draft the coach reviewed onto the
 * raw text still sitting in the composer. Returns nothing once the draft has
 * moved on: a mark on the wrong characters is worse than no mark at all.
 */
export function draftMarks(
	draft: string,
	review: { tips: CoachTip[]; reviewedText: string },
): CoachTip[] {
	if (review.tips.length === 0 || draft.trim() !== review.reviewedText) {
		return [];
	}
	// The coach only ever sees the trimmed draft, so every span is short by
	// whatever whitespace the learner left in front of it.
	const leadingWhitespace = draft.length - draft.trimStart().length;
	if (leadingWhitespace === 0) return review.tips;
	return review.tips.map((tip) => ({
		...tip,
		start: tip.start + leadingWhitespace,
		end: tip.end + leadingWhitespace,
	}));
}

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
			qualitySum += messageQuality(tips);
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
