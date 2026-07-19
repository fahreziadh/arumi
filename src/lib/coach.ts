export interface CoachTip {
	/**
	 * fix = this part is wrong, here is the correction.
	 * tip = this could be better (no single correction).
	 * gem = a good phrase worth keeping.
	 */
	kind: "fix" | "tip" | "gem";
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

const INFORMAL: Array<[RegExp, string]> = [
	[/\bidk\b/i, "I'm not sure"],
	[/\bpls\b/i, "please"],
	[/\bthx\b/i, "thanks"],
	[/\bu\b/i, "you"],
	[/\bgonna\b/i, "going to"],
	[/\bwanna\b/i, "want to"],
];

/** Feedback on a message the learner just sent. */
export function reviewSubmission(text: string): CoachTip | null {
	const trimmed = text.trim();
	if (!trimmed) return null;
	const lead = text.indexOf(trimmed);

	for (const [re, to] of INFORMAL) {
		const m = re.exec(text);
		if (m) {
			return {
				kind: "fix",
				start: m.index,
				end: m.index + m[0].length,
				title: "Sounds a bit too casual",
				detail: `Fine between close friends, but in most messages "${to}" lands better.`,
				quote: m[0],
				correction: to,
			};
		}
	}

	if (/^[a-z]/.test(trimmed)) {
		const firstWord = trimmed.split(/\s+/, 1)[0];
		return {
			kind: "fix",
			start: lead,
			end: lead + firstWord.length,
			title: "Start with a capital",
			detail:
				"Small thing, but it makes the sentence read more sure of itself.",
			quote: firstWord,
			correction: firstWord.charAt(0).toUpperCase() + firstWord.slice(1),
		};
	}

	const words = trimmed.split(/\s+/).filter(Boolean);
	if (words.length < 4) {
		return {
			kind: "tip",
			start: lead,
			end: lead + trimmed.length,
			title: "Add a little more",
			detail:
				"Very short replies can feel abrupt. One extra detail or a small question keeps the conversation warm.",
			quote: trimmed,
		};
	}

	if (
		!trimmed.includes("\n") &&
		!/[.!?…]$/.test(trimmed) &&
		words.length >= 8
	) {
		const lastWord = words[words.length - 1];
		const end = lead + trimmed.length;
		return {
			kind: "fix",
			start: end - lastWord.length,
			end,
			title: "Finish the thought",
			detail: "An ending mark helps a longer sentence land.",
			quote: lastWord,
			correction: `${lastWord}.`,
		};
	}

	return null;
}

const PHRASES: Array<[RegExp, string]> = [
	[/walk me through/i, "A friendly way to ask for a step-by-step explanation."],
	[
		/steps to reproduce/i,
		"Standard phrase in bug reports: the exact actions that trigger the problem.",
	],
	[
		/what's on your mind/i,
		"A casual invitation to share thoughts, common between teammates.",
	],
	[
		/sign(s)? off/i,
		"To formally approve something: “QA signs off” means QA approves it.",
	],
	[
		/follow(ing)? up/i,
		"To return to a topic later: the polite engine of work communication.",
	],
	[/tell me more/i, "A short, warm way to keep a conversation going."],
	[
		/reach(ing)? out/i,
		"To contact someone, very common in professional messages.",
	],
	[/i'd love to hear/i, "Warm professional phrasing for “please tell me”."],
];

/** Pull a useful phrase out of the partner's reply, if there is one. */
export function highlightReply(text: string): CoachTip | null {
	for (const [re, detail] of PHRASES) {
		const m = re.exec(text);
		if (m) {
			return {
				kind: "gem",
				start: m.index,
				end: m.index + m[0].length,
				title: "Worth stealing",
				detail,
				quote: m[0],
			};
		}
	}
	return null;
}
