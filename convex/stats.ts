import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	mutation,
	type MutationCtx,
} from "./_generated/server";
import { requireAdmin } from "./admin";
import { guessCategory, isTipCategory } from "./coachCategories";
import { messageQuality, type ScoredKind } from "./coachScore";
import { DAY_MS } from "./usage";

/**
 * The rollups the profile reads. Every increment here must ride along in the
 * same transaction as the insert or patch that caused it, or these drift the
 * way a separately-maintained counter does.
 */

export function dayKeyOf(at: number): number {
	return Math.floor(at / DAY_MS);
}

interface DailyDelta {
	conversations?: number;
	messagesSent?: number;
	analyzed?: number;
	clean?: number;
	qualitySum?: number;
	gems?: number;
	categories?: Record<string, number>;
}

async function dailyRow(
	ctx: MutationCtx,
	userId: Id<"users">,
	dayKey: number,
): Promise<Doc<"dailyStats"> | null> {
	return await ctx.db
		.query("dailyStats")
		.withIndex("by_user_and_day", (q) =>
			q.eq("userId", userId).eq("dayKey", dayKey),
		)
		.unique();
}

function mergeCategories(
	base: Record<string, number>,
	delta: Record<string, number> | undefined,
): Record<string, number> {
	if (!delta) return base;
	const merged = { ...base };
	for (const [category, count] of Object.entries(delta)) {
		merged[category] = (merged[category] ?? 0) + count;
	}
	return merged;
}

export async function bumpDaily(
	ctx: MutationCtx,
	userId: Id<"users">,
	dayKey: number,
	delta: DailyDelta,
): Promise<void> {
	const existing = await dailyRow(ctx, userId, dayKey);
	if (!existing) {
		await ctx.db.insert("dailyStats", {
			userId,
			dayKey,
			conversations: delta.conversations ?? 0,
			messagesSent: delta.messagesSent ?? 0,
			analyzed: delta.analyzed ?? 0,
			clean: delta.clean ?? 0,
			qualitySum: delta.qualitySum ?? 0,
			gems: delta.gems ?? 0,
			categories: delta.categories ?? {},
		});
		return;
	}
	await ctx.db.patch(existing._id, {
		conversations: existing.conversations + (delta.conversations ?? 0),
		messagesSent: existing.messagesSent + (delta.messagesSent ?? 0),
		analyzed: existing.analyzed + (delta.analyzed ?? 0),
		clean: existing.clean + (delta.clean ?? 0),
		qualitySum: existing.qualitySum + (delta.qualitySum ?? 0),
		gems: existing.gems + (delta.gems ?? 0),
		categories: mergeCategories(existing.categories, delta.categories),
	});
}

interface PlatformDelta {
	conversations?: number;
	analyzed?: number;
	clean?: number;
	qualitySum?: number;
}

export async function bumpPlatform(
	ctx: MutationCtx,
	userId: Id<"users">,
	platform: Doc<"conversations">["platform"],
	delta: PlatformDelta,
): Promise<void> {
	const existing = await ctx.db
		.query("platformStats")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.collect();
	const row = existing.find((r) => r.platform === platform);
	if (!row) {
		await ctx.db.insert("platformStats", {
			userId,
			platform,
			conversations: delta.conversations ?? 0,
			analyzed: delta.analyzed ?? 0,
			clean: delta.clean ?? 0,
			qualitySum: delta.qualitySum ?? 0,
		});
		return;
	}
	await ctx.db.patch(row._id, {
		conversations: row.conversations + (delta.conversations ?? 0),
		analyzed: row.analyzed + (delta.analyzed ?? 0),
		clean: row.clean + (delta.clean ?? 0),
		qualitySum: row.qualitySum + (delta.qualitySum ?? 0),
	});
}

interface StoredTip {
	kind: string;
	title: string;
	category?: string;
}

export function categoryCounts(tips: StoredTip[]): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const tip of tips) {
		if (tip.kind === "gem") continue;
		const category = isTipCategory(tip.category)
			? tip.category
			: guessCategory(tip.kind, tip.title);
		if (!category) continue;
		counts[category] = (counts[category] ?? 0) + 1;
	}
	return counts;
}

/** The stat contribution of one graded message. */
export function analysisDelta(
	author: string,
	tips: StoredTip[],
): { daily: DailyDelta; platform: PlatformDelta } {
	if (author !== "user") {
		const gems = tips.filter((t) => t.kind === "gem").length;
		return { daily: { gems }, platform: {} };
	}
	const scored = tips.filter((t) => t.kind !== "gem") as Array<
		StoredTip & { kind: ScoredKind }
	>;
	const quality = messageQuality(scored);
	const clean = scored.length === 0 ? 1 : 0;
	return {
		daily: {
			analyzed: 1,
			clean,
			qualitySum: quality,
			categories: categoryCounts(tips),
		},
		platform: { analyzed: 1, clean, qualitySum: quality },
	};
}

const ROWS_PER_CLEAR_TRANSACTION = 200;
const CONVERSATIONS_PER_FILL_TRANSACTION = 20;

/**
 * Recomputes every rollup from the marks already stored on messages, so no AI
 * is involved. Safe to re-run: the clear pass comes first, so a second rebuild
 * cannot double-count. Scheduled rather than inline because it spans many
 * transactions.
 */
export const rebuild = mutation({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		await ctx.scheduler.runAfter(0, internal.stats.clearPage, {});
		return null;
	},
});

export const clearPage = internalMutation({
	args: {},
	handler: async (ctx) => {
		const daily = await ctx.db
			.query("dailyStats")
			.take(ROWS_PER_CLEAR_TRANSACTION);
		for (const row of daily) await ctx.db.delete(row._id);
		if (daily.length === ROWS_PER_CLEAR_TRANSACTION) {
			await ctx.scheduler.runAfter(0, internal.stats.clearPage, {});
			return null;
		}
		const platform = await ctx.db
			.query("platformStats")
			.take(ROWS_PER_CLEAR_TRANSACTION);
		for (const row of platform) await ctx.db.delete(row._id);
		if (platform.length === ROWS_PER_CLEAR_TRANSACTION) {
			await ctx.scheduler.runAfter(0, internal.stats.clearPage, {});
			return null;
		}
		await ctx.scheduler.runAfter(0, internal.stats.fillPage, { cursor: null });
		return null;
	},
});

export const fillPage = internalMutation({
	args: { cursor: v.union(v.string(), v.null()) },
	handler: async (ctx, args) => {
		const page = await ctx.db.query("conversations").paginate({
			cursor: args.cursor,
			numItems: CONVERSATIONS_PER_FILL_TRANSACTION,
		});

		for (const conversation of page.page) {
			const day = dayKeyOf(conversation._creationTime);
			await bumpDaily(ctx, conversation.userId, day, { conversations: 1 });
			await bumpPlatform(ctx, conversation.userId, conversation.platform, {
				conversations: 1,
			});

			const messages = await ctx.db
				.query("messages")
				.withIndex("by_conversation", (q) =>
					q.eq("conversationId", conversation._id),
				)
				.collect();

			for (const message of messages) {
				const messageDay = dayKeyOf(message._creationTime);
				if (message.author === "user") {
					await bumpDaily(ctx, conversation.userId, messageDay, {
						messagesSent: 1,
					});
				}
				// No tips means never analyzed, which is not the same as clean: such
				// a message must not enter the analyzed or clean counts at all.
				// A message the learner adopted from the coach is likewise not
				// their own writing, so it scores neither for nor against them.
				if (!message.tips || message.fromCoachRewrite) continue;
				const { daily, platform } = analysisDelta(message.author, message.tips);
				await bumpDaily(ctx, conversation.userId, messageDay, daily);
				if (platform.analyzed) {
					await bumpPlatform(
						ctx,
						conversation.userId,
						conversation.platform,
						platform,
					);
				}
			}
		}

		if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.stats.fillPage, {
				cursor: page.continueCursor,
			});
		}
		return null;
	},
});
