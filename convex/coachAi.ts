import { type Infer, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { action, type ActionCtx, internalAction } from "./_generated/server";
import { modelFor } from "./aiConfig";
import {
	CATEGORY_PROMPT_LIST,
	guessCategory,
	isTipCategory,
} from "./coachCategories";
import { chatJson, type TokenUsage } from "./openrouter";
import { renderPrompt, withoutLongDashes } from "./prompts";
import { vCoachTip } from "./schema";
import { dayKeyOf } from "./stats";

interface RawTip {
	kind?: string;
	quote?: string;
	title?: string;
	detail?: string;
	correction?: string;
	category?: string;
}

const TIP_KINDS = new Set(["fix", "tip", "tone"]);

/**
 * Low on purpose. The coach's job is to be consistent: at higher settings it
 * re-litigates the same register from scratch on every message and ends up
 * contradicting the advice it gave two messages ago.
 */
const COACH_TEMPERATURE = 0.1;

const APOSTROPHES = "['’‘ʼ`]";
const DOUBLE_QUOTES = '["“”]';

/**
 * A quote pattern tolerant of the ways a model retypes what it copied: curly
 * apostrophes for straight ones, a single space for a line break, a different
 * capital at the start of a fragment.
 */
function quotePattern(quote: string): string {
	return quote
		.trim()
		.split(/(\s+)/)
		.map((part) =>
			/^\s+$/.test(part)
				? "\\s+"
				: part
						.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
						.replace(/['’‘ʼ`]/g, APOSTROPHES)
						.replace(/["“”]/g, DOUBLE_QUOTES),
		)
		.join("");
}

/**
 * Locates the model's quote in the text. Models cannot count characters, so
 * spans are recovered here rather than taken from the model. A quote that
 * cannot be anchored costs the learner the whole tip, so match loosely and
 * prefer the tightest hit.
 */
function spanOfQuote(text: string, quote: string): [number, number] | null {
	const pattern = quotePattern(quote);
	if (!pattern) return null;
	const attempts = [
		new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "u"),
		new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, "ui"),
		new RegExp(pattern, "ui"),
	];
	for (const attempt of attempts) {
		const match = attempt.exec(text);
		if (match) return [match.index, match.index + match[0].length];
	}
	return null;
}

export type CoachTipValue = Infer<typeof vCoachTip>;

/**
 * The client renderer walks tips in order against a single cursor, so anything
 * out of order or overlapping would be dropped there invisibly. Enforce that
 * contract here, where the drop is deliberate.
 */
function inRenderOrder(tips: CoachTipValue[], max: number): CoachTipValue[] {
	const kept: CoachTipValue[] = [];
	for (const tip of [...tips].sort((a, b) => a.start - b.start)) {
		if (kept.length >= max) break;
		const previous = kept[kept.length - 1];
		if (previous && tip.start < previous.end) continue;
		kept.push(tip);
	}
	return kept;
}

/**
 * The UI swaps a correction in for the quote, so it has to be one wording.
 * Models like to offer a menu ("Any ideas? / What do you fancy?"); only the
 * first survives, because a list of options cannot be swapped into a sentence.
 */
export function singleCorrection(raw: string | undefined): string | undefined {
	if (!raw) return undefined;
	const [first] = withoutLongDashes(raw).split(/\s*\/\s*/);
	return first.trim() || undefined;
}

function normalizeTips(
	text: string,
	raw: RawTip[] | undefined,
	max: number,
): CoachTipValue[] {
	const anchored = (raw ?? [])
		.filter((t) =>
			Boolean(t.quote && t.detail && t.kind && TIP_KINDS.has(t.kind)),
		)
		.flatMap((t): CoachTipValue[] => {
			const span = spanOfQuote(text, t.quote as string);
			if (!span) {
				console.warn("Coach tip dropped, quote not in text", t.quote);
				return [];
			}
			const kind = t.kind as "fix" | "tip" | "tone";
			const title = withoutLongDashes(t.title || "Worth a look").slice(0, 60);
			return [
				{
					kind,
					start: span[0],
					end: span[1],
					title,
					detail: withoutLongDashes(t.detail as string),
					quote: text.slice(span[0], span[1]),
					correction: singleCorrection(t.correction),
					category: isTipCategory(t.category)
						? t.category
						: (guessCategory(kind, title) ?? undefined),
				},
			];
		});
	return inRenderOrder(anchored, max);
}

function normalizeGems(
	text: string,
	raw: RawTip[] | undefined,
	max: number,
): CoachTipValue[] {
	const anchored = (raw ?? [])
		.filter((g) => Boolean(g.quote && g.detail))
		.flatMap((g): CoachTipValue[] => {
			const span = spanOfQuote(text, g.quote as string);
			if (!span) return [];
			return [
				{
					kind: "gem" as const,
					start: span[0],
					end: span[1],
					title: "Worth stealing",
					detail: withoutLongDashes(g.detail as string),
					quote: text.slice(span[0], span[1]),
				},
			];
		});
	return inRenderOrder(anchored, max);
}

function meaningfulRewrite(text: string, raw: unknown): string | null {
	if (typeof raw !== "string") return null;
	const rewrite = withoutLongDashes(raw).trim();
	if (!rewrite || rewrite === text.trim()) return null;
	return rewrite;
}

function renderTranscript(
	history: Array<{ author: string; text: string }>,
	personaName: string,
): string {
	if (history.length === 0) return "(this is the first message)";
	return history
		.map(
			(m) =>
				`${m.author === "user" ? "Learner" : personaName}: ${m.text.replace(/\s+/g, " ").slice(0, 400)}`,
		)
		.join("\n");
}

function submissionPrompt(context: {
	prompts: { coachSubmission: string };
	platformLabel: string;
	topic: string;
	persona: { name: string; role: string };
	history: Array<{ author: string; text: string }>;
}): string {
	return renderPrompt(context.prompts.coachSubmission, {
		personaName: context.persona.name,
		personaRole: context.persona.role.toLowerCase(),
		platformLabel: context.platformLabel,
		topic: context.topic,
		categories: CATEGORY_PROMPT_LIST,
		history: renderTranscript(context.history, context.persona.name),
	});
}

function draftPrompt(context: {
	prompts: { coachDraft: string };
	platformLabel: string;
	topic: string;
	persona: { name: string; role: string };
	history: Array<{ author: string; text: string }>;
}): string {
	return renderPrompt(context.prompts.coachDraft, {
		personaName: context.persona.name,
		personaRole: context.persona.role.toLowerCase(),
		platformLabel: context.platformLabel,
		topic: context.topic,
		history: renderTranscript(context.history, context.persona.name),
	});
}

function gemsPrompt(context: {
	prompts: { coachGems: string };
	platformLabel: string;
}): string {
	return renderPrompt(context.prompts.coachGems, {
		platformLabel: context.platformLabel,
	});
}

const MIN_DRAFT_CHARS = 8;
const MAX_DRAFT_CHARS = 2000;
const MAX_DRAFT_TIPS = 2;
const MAX_SUBMISSION_TIPS = 3;
const MAX_GEMS = 2;

export interface DraftReview {
	tips: CoachTipValue[];
	rewrite: string | null;
}

const EMPTY_REVIEW: DraftReview = { tips: [], rewrite: null };

async function hasQuotaLeft(
	ctx: ActionCtx,
	userId: Id<"users">,
): Promise<boolean> {
	try {
		await ctx.runQuery(internal.usage.assertUnderLimit, {
			userId,
			dayKey: dayKeyOf(Date.now()),
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Coaches an unsent draft. Returns its result instead of storing it: a draft
 * changes on every keystroke, and writing that churn to the message row would
 * rewrite the document for text that may never be sent.
 */
export const reviewDraft = action({
	args: { conversationId: v.id("conversations"), text: v.string() },
	handler: async (ctx, args): Promise<DraftReview> => {
		const text = args.text.trim().slice(0, MAX_DRAFT_CHARS);
		if (text.length < MIN_DRAFT_CHARS) return EMPTY_REVIEW;

		const context = await ctx.runQuery(internal.conversations.draftContext, {
			conversationId: args.conversationId,
		});
		if (!context) return EMPTY_REVIEW;
		if (!(await hasQuotaLeft(ctx, context.userId))) return EMPTY_REVIEW;

		const coach = modelFor(context.config, "coach");
		const result = await chatJson<{ tips?: RawTip[]; rewrite?: string | null }>({
			...coach,
			temperature: COACH_TEMPERATURE,
			label: "coach-draft",
			onUsage: async (usage: TokenUsage) => {
				await ctx.runMutation(internal.usage.record, {
					userId: context.userId,
					conversationId: context.conversationId,
					kind: "coach-draft",
					model: coach.model,
					...usage,
				});
			},
			messages: [
				{ role: "system", content: draftPrompt(context) },
				{ role: "user", content: text },
			],
		});

		return {
			tips: normalizeTips(text, result.tips, MAX_DRAFT_TIPS),
			rewrite: meaningfulRewrite(text, result.rewrite),
		};
	},
});

export const analyzeMessage = internalAction({
	args: { messageId: v.id("messages") },
	handler: async (ctx, args) => {
		const context = await ctx.runQuery(internal.conversations.messageContext, {
			messageId: args.messageId,
		});
		if (!context) return;
		const { message, config } = context;
		const coach = modelFor(config, "coach");
		const recordUsage = (kind: string) => async (usage: TokenUsage) => {
			await ctx.runMutation(internal.usage.record, {
				userId: context.userId,
				conversationId: context.conversationId,
				kind,
				model: coach.model,
				...usage,
			});
		};

		try {
			if (message.author === "user") {
				const result = await chatJson<{
					tips?: RawTip[];
					rewrite?: string | null;
				}>({
					...coach,
					temperature: COACH_TEMPERATURE,
					label: "coach-submission",
					onUsage: recordUsage("coach-submission"),
					messages: [
						{ role: "system", content: submissionPrompt(context) },
						{ role: "user", content: message.text },
					],
				});
				await ctx.runMutation(internal.conversations.storeAnalysis, {
					messageId: args.messageId,
					tips: normalizeTips(message.text, result.tips, MAX_SUBMISSION_TIPS),
					rewrite: meaningfulRewrite(message.text, result.rewrite),
				});
			} else {
				const result = await chatJson<{ gems?: RawTip[] }>({
					...coach,
					temperature: COACH_TEMPERATURE,
					label: "coach-gems",
					onUsage: recordUsage("coach-gems"),
					messages: [
						{ role: "system", content: gemsPrompt(context) },
						{ role: "user", content: message.text },
					],
				});
				await ctx.runMutation(internal.conversations.storeAnalysis, {
					messageId: args.messageId,
					tips: normalizeGems(message.text, result.gems, MAX_GEMS),
					rewrite: null,
				});
			}
		} catch (error) {
			console.error("Coach analysis failed", error);
			await ctx.runMutation(internal.conversations.failAnalysis, {
				messageId: args.messageId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	},
});
