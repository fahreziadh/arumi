import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	query,
	type QueryCtx,
} from "./_generated/server";
import { withDefaults } from "./aiConfig";

export const DAY_MS = 24 * 60 * 60 * 1000;

const ZERO = {
	conversations: 0,
	messagesSent: 0,
	requests: 0,
	promptTokens: 0,
	completionTokens: 0,
	cost: 0,
};

async function totalsFor(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
	return await ctx.db
		.query("usageTotals")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.unique();
}

/** Increments a user's counters in the calling mutation's transaction. */
export async function bumpTotals(
	ctx: MutationCtx,
	userId: Id<"users">,
	delta: Partial<typeof ZERO>,
): Promise<void> {
	const existing = await totalsFor(ctx, userId);
	const base = existing ?? { ...ZERO };
	const dayKey = Math.floor(Date.now() / DAY_MS);
	const usedToday =
		existing && existing.dayKey === dayKey ? (existing.messagesToday ?? 0) : 0;
	const next = {
		userId,
		conversations: base.conversations + (delta.conversations ?? 0),
		messagesSent: base.messagesSent + (delta.messagesSent ?? 0),
		requests: base.requests + (delta.requests ?? 0),
		promptTokens: base.promptTokens + (delta.promptTokens ?? 0),
		completionTokens: base.completionTokens + (delta.completionTokens ?? 0),
		cost: base.cost + (delta.cost ?? 0),
		lastActiveAt: Date.now(),
		dayKey,
		messagesToday: usedToday + (delta.messagesSent ?? 0),
	};
	if (existing) await ctx.db.patch(existing._id, next);
	else await ctx.db.insert("usageTotals", next);
}

function limitReachedError(limit: number): Error {
	return new Error(
		`You've used all ${limit} free messages for today. They reset at midnight UTC.`,
	);
}

async function assertUnder(
	ctx: QueryCtx | MutationCtx,
	userId: Id<"users">,
	dayKey: number,
): Promise<void> {
	const config = withDefaults(await ctx.db.query("aiConfig").first());
	const limit = config.dailyMessageLimit;
	if (limit <= 0) return;
	const row = await totalsFor(ctx, userId);
	const used = row && row.dayKey === dayKey ? (row.messagesToday ?? 0) : 0;
	if (used >= limit) throw limitReachedError(limit);
}

/** Backstop for mutations; the UI blocks the affordances before this fires. */
export async function assertUnderDailyLimit(
	ctx: MutationCtx,
	userId: Id<"users">,
): Promise<void> {
	await assertUnder(ctx, userId, Math.floor(Date.now() / DAY_MS));
}

/** For actions; dayKey comes from the caller so results never go stale. */
export const assertUnderLimit = internalQuery({
	args: { userId: v.id("users"), dayKey: v.number() },
	handler: async (ctx, args) => {
		await assertUnder(ctx, args.userId, args.dayKey);
		return null;
	},
});

/**
 * The signed-in user's quota state. No wall clock in here: the client
 * compares dayKey against its own current day and handles the rollover.
 */
export const mine = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;
		const config = withDefaults(await ctx.db.query("aiConfig").first());
		const row = await totalsFor(ctx, userId);
		return {
			/** 0 = unlimited. */
			limit: config.dailyMessageLimit,
			dayKey: row?.dayKey ?? null,
			messagesToday: row?.messagesToday ?? 0,
		};
	},
});

export const record = internalMutation({
	args: {
		userId: v.id("users"),
		conversationId: v.optional(v.id("conversations")),
		kind: v.string(),
		model: v.string(),
		promptTokens: v.number(),
		completionTokens: v.number(),
		cost: v.number(),
	},
	handler: async (ctx, args) => {
		await ctx.db.insert("aiUsage", args);
		await bumpTotals(ctx, args.userId, {
			requests: 1,
			promptTokens: args.promptTokens,
			completionTokens: args.completionTokens,
			cost: args.cost,
		});
	},
});
