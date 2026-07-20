/**
 * The closed set of skill areas a coach mark can belong to.
 *
 * The model also writes a free-text title per mark, but titles are not stable
 * enough to aggregate: the same mistake comes back worded differently each
 * day, so one recurring weakness splits into a dozen one-offs.
 */
export const TIP_CATEGORIES = [
	"grammar",
	"vocabulary",
	"spelling",
	"punctuation",
	"register",
	"clarity",
	"structure",
] as const;

export type TipCategory = (typeof TIP_CATEGORIES)[number];

const CATEGORY_SET: ReadonlySet<string> = new Set(TIP_CATEGORIES);

export function isTipCategory(value: unknown): value is TipCategory {
	return typeof value === "string" && CATEGORY_SET.has(value);
}

export const CATEGORY_LABEL: Record<TipCategory, string> = {
	grammar: "Grammar",
	vocabulary: "Word choice",
	spelling: "Spelling",
	punctuation: "Punctuation",
	register: "Tone & register",
	clarity: "Clarity",
	structure: "Structure",
};

export const CATEGORY_HINT: Record<TipCategory, string> = {
	grammar: "Tenses, agreement, articles, prepositions.",
	vocabulary: "The word is real, but not the one a native speaker reaches for.",
	spelling: "Misspelled or mistyped words.",
	punctuation: "Commas, apostrophes, sentence endings.",
	register: "Too casual or too stiff for who you are writing to.",
	clarity: "The meaning takes a second read to land.",
	structure: "Greetings, sign-offs, and how the message is put together.",
};

export const CATEGORY_PROMPT_LIST = TIP_CATEGORIES.map(
	(c) => `${c} (${CATEGORY_HINT[c].toLowerCase()})`,
).join("; ");

interface TitlePattern {
	category: TipCategory;
	pattern: RegExp;
}

const TITLE_PATTERNS_NARROWEST_FIRST: TitlePattern[] = [
	{ category: "spelling", pattern: /\b(spell|typo|misspel)/i },
	{
		category: "punctuation",
		pattern: /\b(comma|apostrophe|punctuat|period|full stop|capital|capitali[sz])/i,
	},
	{
		category: "register",
		pattern: /\b(casual|formal|polite|tone|blunt|abrupt|stiff|friendly|rude)/i,
	},
	{
		category: "structure",
		pattern: /\b(greeting|sign[- ]?off|open(ing)?|clos(e|ing)|paragraph|structure)/i,
	},
	{
		category: "clarity",
		pattern: /\b(unclear|vague|confus|clarity|wordy|rambl|specific)/i,
	},
	{
		category: "vocabulary",
		pattern: /\b(word|phrase|wording|natural|idiom|express)/i,
	},
	{
		category: "grammar",
		pattern: /\b(grammar|tense|plural|article|preposition|agreement|verb)/i,
	},
];

/**
 * Best guess at a category for a mark made before the enum existed. Anything
 * it cannot place is left uncounted rather than dumped into a wrong bucket.
 */
export function guessCategory(
	kind: string,
	title: string,
): TipCategory | null {
	if (kind === "tone") return "register";
	for (const { category, pattern } of TITLE_PATTERNS_NARROWEST_FIRST) {
		if (pattern.test(title)) return category;
	}
	return kind === "fix" ? "grammar" : null;
}
