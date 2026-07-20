import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { query, type QueryCtx } from "./_generated/server";
import { currentStreak } from "./streak";

/** One row exists per active day, so this is effectively a lifetime. */
const MAX_ACTIVE_DAYS = 1500;
const TREND_WEEKS = 8;
const DAYS_PER_WEEK = 7;
const SKILL_WINDOW_DAYS = 14;
const CONVERSATIONS_SCANNED_FOR_EXAMPLES = 5;
const MESSAGES_SCANNED_PER_CONVERSATION = 60;
const MAX_EXAMPLES = 4;

export const identity = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;
		const user = await ctx.db.get(userId);
		if (!user) return null;
		return {
			name: user.name ?? user.email ?? "You",
			email: user.email ?? null,
			image: user.image ?? null,
		};
	},
});

function averageScore(qualitySum: number, analyzed: number): number | null {
	return analyzed === 0 ? null : Math.round(qualitySum / analyzed);
}

function sumCategories(rows: Doc<"dailyStats">[]): Record<string, number> {
	const totals: Record<string, number> = {};
	for (const row of rows) {
		for (const [category, count] of Object.entries(row.categories)) {
			totals[category] = (totals[category] ?? 0) + count;
		}
	}
	return totals;
}

function weeklyTrend(days: Doc<"dailyStats">[], today: number) {
	return Array.from({ length: TREND_WEEKS }, (_, index) => {
		const weeksAgo = TREND_WEEKS - 1 - index;
		const end = today - weeksAgo * DAYS_PER_WEEK;
		const start = end - (DAYS_PER_WEEK - 1);
		const inWeek = days.filter((d) => d.dayKey >= start && d.dayKey <= end);
		const analyzed = inWeek.reduce((n, d) => n + d.analyzed, 0);
		return {
			weeksAgo,
			score: averageScore(
				inWeek.reduce((n, d) => n + d.qualitySum, 0),
				analyzed,
			),
			analyzed,
			messages: inWeek.reduce((n, d) => n + d.messagesSent, 0),
		};
	});
}

/** All-time mark counts per skill area, with the last window against the one
 * before it so the page can say whether a weakness is receding. */
function skillBreakdown(days: Doc<"dailyStats">[], today: number) {
	const recentCut = today - (SKILL_WINDOW_DAYS - 1);
	const priorCut = recentCut - SKILL_WINDOW_DAYS;
	const recent = sumCategories(days.filter((d) => d.dayKey > recentCut));
	const prior = sumCategories(
		days.filter((d) => d.dayKey > priorCut && d.dayKey <= recentCut),
	);
	return Object.entries(sumCategories(days))
		.map(([category, total]) => ({
			category,
			total,
			recent: recent[category] ?? 0,
			prior: prior[category] ?? 0,
		}))
		.sort((a, b) => b.total - a.total);
}

interface MarkExample {
	kind: string;
	title: string;
	detail: string;
	quote: string;
	correction?: string;
}

async function recentMarkExamples(
	ctx: QueryCtx,
	userId: Id<"users">,
): Promise<MarkExample[]> {
	const conversations = await ctx.db
		.query("conversations")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.order("desc")
		.take(CONVERSATIONS_SCANNED_FOR_EXAMPLES);
	const examples: MarkExample[] = [];
	for (const conversation of conversations) {
		if (examples.length >= MAX_EXAMPLES) break;
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", conversation._id),
			)
			.take(MESSAGES_SCANNED_PER_CONVERSATION);
		for (const message of messages) {
			if (message.author !== "user" || !message.tips) continue;
			for (const tip of message.tips) {
				if (tip.kind === "gem" || examples.length >= MAX_EXAMPLES) continue;
				examples.push({
					kind: tip.kind,
					title: tip.title,
					detail: tip.detail,
					quote: tip.quote,
					correction: tip.correction,
				});
			}
		}
	}
	return examples;
}

export const mine = query({
	// A query must not read the wall clock, so the client passes its own day.
	args: { today: v.number() },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;
		const today = args.today;

		const [user, platformRows] = await Promise.all([
			ctx.db.get(userId),
			ctx.db
				.query("platformStats")
				.withIndex("by_user", (q) => q.eq("userId", userId))
				.collect(),
		]);
		if (!user) return null;

		// Volume is summed from these rows rather than read from usageTotals:
		// that counter is maintained separately and has already drifted behind
		// reality, whereas these are rebuildable from the messages themselves.
		const days = await ctx.db
			.query("dailyStats")
			.withIndex("by_user_and_day", (q) => q.eq("userId", userId))
			.order("desc")
			.take(MAX_ACTIVE_DAYS);

		const lifetimeAnalyzed = days.reduce((n, d) => n + d.analyzed, 0);
		const lifetimeClean = days.reduce((n, d) => n + d.clean, 0);
		const lifetimeQuality = days.reduce((n, d) => n + d.qualitySum, 0);
		const gems = days.reduce((n, d) => n + d.gems, 0);

		const activeDays = new Set(
			days.filter((d) => d.messagesSent > 0).map((d) => d.dayKey),
		);

		return {
			name: user.name ?? user.email ?? "You",
			email: user.email ?? null,
			image: user.image ?? null,
			joinedAt: user._creationTime,
			lifetime: {
				conversations: days.reduce((n, d) => n + d.conversations, 0),
				messagesSent: days.reduce((n, d) => n + d.messagesSent, 0),
			},
			writing: {
				score: averageScore(lifetimeQuality, lifetimeAnalyzed),
				analyzed: lifetimeAnalyzed,
				clean: lifetimeClean,
				gems,
			},
			streak: {
				current: currentStreak(activeDays, today),
				activeDays: activeDays.size,
			},
			trend: weeklyTrend(days, today),
			skills: skillBreakdown(days, today),
			platforms: platformRows
				.map((row) => ({
					platform: row.platform,
					score: averageScore(row.qualitySum, row.analyzed),
					analyzed: row.analyzed,
					conversations: row.conversations,
				}))
				.sort((a, b) => b.conversations - a.conversations),
			examples: await recentMarkExamples(ctx, userId),
		};
	},
});
