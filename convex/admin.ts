import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { PROMPT_DEFS, PROMPT_KEYS, type PromptKey } from "./prompts";
import {
	internalQuery,
	mutation,
	type MutationCtx,
	query,
	type QueryCtx,
} from "./_generated/server";
import { DEFAULT_AI_CONFIG, withDefaults } from "./aiConfig";
import { setDailyLimitOverride } from "./usage";

// Admin = the one account matching the ADMIN_EMAIL env var.
async function adminEmail(ctx: QueryCtx | MutationCtx): Promise<string | null> {
	const allowed = process.env.ADMIN_EMAIL;
	if (!allowed) return null;
	const userId = await getAuthUserId(ctx);
	if (!userId) return null;
	const user = await ctx.db.get(userId);
	if (!user?.email || user.email.toLowerCase() !== allowed.toLowerCase()) {
		return null;
	}
	return user.email;
}

export async function requireAdmin(
	ctx: QueryCtx | MutationCtx,
): Promise<void> {
	if (!(await adminEmail(ctx))) throw new Error("Unauthorized");
}

export const isAdmin = query({
	args: {},
	handler: async (ctx) => (await adminEmail(ctx)) !== null,
});

export const assertAdmin = internalQuery({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		return null;
	},
});

export const getConfig = query({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		return {
			...withDefaults(await ctx.db.query("aiConfig").first()),
			defaults: DEFAULT_AI_CONFIG,
			hasOpenRouterKey: Boolean(process.env.OPENROUTER_API_KEY),
		};
	},
});

export const saveConfig = mutation({
	args: {
		model: v.string(),
		temperature: v.number(),
		systemPrompt: v.string(),
		coachModel: v.string(),
		provider: v.string(),
		coachProvider: v.string(),
		prepareModel: v.string(),
		reasoning: v.string(),
		coachReasoning: v.string(),
		prepareReasoning: v.string(),
		dailyMessageLimit: v.number(),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		const model = args.model.trim();
		if (!model) throw new Error("Model is required");
		// OpenRouter ids look like vendor/model, optionally with a :variant
		// suffix. This catches typos and random text, not catalog membership;
		// the client checks the catalog when it can load it.
		const idShape = /^[\w.-]+\/[\w.-]+(:[\w.-]+)?$/;
		for (const [label, value] of [
			["Model", model],
			["Coach model", args.coachModel.trim()],
			["Prepare model", args.prepareModel.trim()],
		] as const) {
			if (value && !idShape.test(value)) {
				throw new Error(
					`${label} doesn't look like an OpenRouter id (vendor/model)`,
				);
			}
		}
		if (args.temperature < 0 || args.temperature > 2) {
			throw new Error("Temperature must be between 0 and 2");
		}
		if (
			!Number.isInteger(args.dailyMessageLimit) ||
			args.dailyMessageLimit < 0
		) {
			throw new Error("Daily message limit must be a whole number, 0 or more");
		}
		const THINKING = new Set(["", "off", "low", "medium", "high"]);
		for (const value of [
			args.reasoning,
			args.coachReasoning,
			args.prepareReasoning,
		]) {
			if (!THINKING.has(value)) {
				throw new Error(`Unknown thinking setting: ${value}`);
			}
		}
		const patch = {
			model,
			temperature: args.temperature,
			systemPrompt: args.systemPrompt.trim(),
			coachModel: args.coachModel.trim(),
			provider: args.provider.trim(),
			coachProvider: args.coachProvider.trim(),
			prepareModel: args.prepareModel.trim(),
			reasoning: args.reasoning,
			coachReasoning: args.coachReasoning,
			prepareReasoning: args.prepareReasoning,
			dailyMessageLimit: args.dailyMessageLimit,
		};
		const existing = await ctx.db.query("aiConfig").first();
		if (existing) await ctx.db.patch(existing._id, patch);
		else await ctx.db.insert("aiConfig", patch);
	},
});

/** Every user joined with their usage counters, biggest spenders first. */
export const usageOverview = query({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		const [users, totals, config] = await Promise.all([
			ctx.db.query("users").take(1000),
			ctx.db.query("usageTotals").take(1000),
			ctx.db.query("aiConfig").first(),
		]);
		const byUser = new Map(totals.map((t) => [t.userId, t]));
		const rows = users.map((user) => {
			const t = byUser.get(user._id);
			return {
				id: user._id,
				name: user.name ?? user.email ?? "Unknown",
				email: user.email ?? null,
				image: user.image ?? null,
				joinedAt: user._creationTime,
				conversations: t?.conversations ?? 0,
				messagesSent: t?.messagesSent ?? 0,
				requests: t?.requests ?? 0,
				promptTokens: t?.promptTokens ?? 0,
				completionTokens: t?.completionTokens ?? 0,
				cost: t?.cost ?? 0,
				lastActiveAt: t?.lastActiveAt ?? null,
				dayKey: t?.dayKey ?? null,
				messagesToday: t?.messagesToday ?? 0,
				/** null = this user follows the global daily limit. */
				limitOverride: t?.dailyMessageLimit ?? null,
			};
		});
		rows.sort(
			(a, b) =>
				b.cost - a.cost || (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0),
		);
		return {
			dailyMessageLimit: withDefaults(config).dailyMessageLimit,
			users: rows,
		};
	},
});

export const setUserDailyLimit = mutation({
	args: {
		userId: v.id("users"),
		/** 0 = unlimited, null = follow the global limit. */
		limit: v.union(v.number(), v.null()),
	},
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		if (
			args.limit !== null &&
			(!Number.isInteger(args.limit) || args.limit < 0)
		) {
			throw new Error("Daily message limit must be a whole number, 0 or more");
		}
		if (!(await ctx.db.get(args.userId))) throw new Error("No such user");
		await setDailyLimitOverride(ctx, args.userId, args.limit);
	},
});

export const getPrompts = query({
	args: {},
	handler: async (ctx) => {
		await requireAdmin(ctx);
		const rows = await ctx.db.query("prompts").collect();
		const overrides = new Map(rows.map((r) => [r.key, r.template]));
		return PROMPT_KEYS.map((key) => {
			const def = PROMPT_DEFS[key];
			const override = overrides.get(key)?.trim();
			return {
				key,
				label: def.label,
				description: def.description,
				variables: [...def.variables],
				template: override || def.template,
				defaultTemplate: def.template,
				customized: Boolean(override && override !== def.template),
			};
		});
	},
});

function assertPromptKey(key: string): asserts key is PromptKey {
	if (!PROMPT_KEYS.includes(key as PromptKey)) {
		throw new Error(`Unknown prompt: ${key}`);
	}
}

export const savePrompt = mutation({
	args: { key: v.string(), template: v.string() },
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		assertPromptKey(args.key);
		const template = args.template.trim();
		if (!template) throw new Error("Prompt can't be empty");
		const existing = await ctx.db
			.query("prompts")
			.withIndex("by_key", (q) => q.eq("key", args.key))
			.unique();
		if (existing) await ctx.db.patch(existing._id, { template });
		else await ctx.db.insert("prompts", { key: args.key, template });
	},
});

export const resetPrompt = mutation({
	args: { key: v.string() },
	handler: async (ctx, args) => {
		await requireAdmin(ctx);
		assertPromptKey(args.key);
		const existing = await ctx.db
			.query("prompts")
			.withIndex("by_key", (q) => q.eq("key", args.key))
			.unique();
		if (existing) await ctx.db.delete(existing._id);
	},
});
