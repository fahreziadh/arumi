import { useAction } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { CoachTip } from "./coach";
import { useSettings } from "./settings";

/** Long enough that normal typing never fires a call mid-word. */
const TYPING_IDLE_MS = 900;

/** Mirrors MIN_DRAFT_CHARS on the server; avoids a pointless round trip. */
const MIN_REVIEWABLE_CHARS = 8;

export interface DraftCoach {
	tips: CoachTip[];
	rewrite: string | null;
	pending: boolean;
	/** The exact draft the tips are anchored against; never the live draft. */
	reviewedText: string;
	/** A counter, not a flag: praise marks a draft BECOMING clean. */
	praiseCount: number;
}

type CoachReview = Omit<DraftCoach, "praiseCount">;

const NO_REVIEW: CoachReview = {
	tips: [],
	rewrite: null,
	pending: false,
	reviewedText: "",
};

/**
 * Text the coach itself just supplied, which it must not then review.
 * Without this the coach marks its own rewrite, suggests another, and the
 * learner can never reach a draft it is happy with.
 */
export function isCoachOwnWording(
	draft: string,
	adoptedRewrite: string | null,
): boolean {
	return adoptedRewrite !== null && draft.trim() === adoptedRewrite.trim();
}

/** Reviews the draft a beat after typing stops. */
export function useDraftCoach(
	conversationId: string,
	draft: string,
	adoptedRewrite: string | null = null,
): DraftCoach {
	const reviewDraft = useAction(api.coachAi.reviewDraft);
	const { liveCoach } = useSettings();
	const [review, setReview] = useState<CoachReview>(NO_REVIEW);
	const [praiseCount, setPraiseCount] = useState(0);

	const latestRequestIdRef = useRef(0);
	const requestedTextRef = useRef("");
	const lastReviewWasCleanRef = useRef(false);

	useEffect(() => {
		const reset = () => {
			latestRequestIdRef.current += 1;
			requestedTextRef.current = "";
			lastReviewWasCleanRef.current = false;
			setReview(NO_REVIEW);
		};

		if (!liveCoach) {
			reset();
			return;
		}

		const text = draft.trim();
		if (
			text.length < MIN_REVIEWABLE_CHARS ||
			isCoachOwnWording(draft, adoptedRewrite)
		) {
			reset();
			return;
		}
		if (text === requestedTextRef.current) return;

		// Marks anchored to the old text would sit on the wrong characters, so
		// they clear the moment the draft moves on. Pending waits for a request
		// to actually go out, so it cannot flicker on every keystroke.
		setReview((prev) => (prev.reviewedText === text ? prev : NO_REVIEW));

		const timer = window.setTimeout(() => {
			const requestId = ++latestRequestIdRef.current;
			requestedTextRef.current = text;
			setReview({ ...NO_REVIEW, pending: true });
			reviewDraft({
				conversationId: conversationId as Id<"conversations">,
				text,
			})
				.then((result) => {
					if (latestRequestIdRef.current !== requestId) return;
					const clean = result.tips.length === 0 && !result.rewrite;
					if (clean && !lastReviewWasCleanRef.current) {
						setPraiseCount((n) => n + 1);
					}
					lastReviewWasCleanRef.current = clean;
					setReview({
						tips: result.tips,
						rewrite: result.rewrite,
						pending: false,
						reviewedText: text,
					});
				})
				.catch(() => {
					if (latestRequestIdRef.current !== requestId) return;
					// Coaching a draft is an extra; a failure stays silent rather than
					// putting an error over the composer.
					lastReviewWasCleanRef.current = false;
					setReview(NO_REVIEW);
				});
		}, TYPING_IDLE_MS);

		return () => window.clearTimeout(timer);
	}, [draft, conversationId, liveCoach, reviewDraft, adoptedRewrite]);

	return { ...review, praiseCount };
}
