import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Mirrors src/lib/coach.ts CoachTip. On a message: absent = not analyzed,
// [] = analyzed and clean.
export const vCoachTip = v.object({
	kind: v.union(
		v.literal("fix"),
		v.literal("tip"),
		v.literal("tone"),
		v.literal("gem"),
	),
	start: v.number(),
	end: v.number(),
	title: v.string(),
	detail: v.string(),
	quote: v.string(),
	correction: v.optional(v.string()),
});

export const vPlatform = v.union(
	v.literal("email"),
	v.literal("slack"),
	v.literal("github"),
	v.literal("whatsapp"),
	v.literal("telegram"),
	v.literal("discord"),
	v.literal("teams"),
	v.literal("linkedin"),
	v.literal("support"),
	v.literal("custom"),
);

export default defineSchema({
	...authTables,

	conversations: defineTable({
		userId: v.id("users"),
		platform: vPlatform,
		platformLabel: v.string(),
		topic: v.string(),
		personaName: v.string(),
		personaRole: v.string(),
		/** True while a persona reply is being generated. */
		typing: v.boolean(),
		/** Last generation failure, shown in the room. No fallbacks by design. */
		aiError: v.optional(v.string()),
	}).index("by_user", ["userId"]),

	messages: defineTable({
		conversationId: v.id("conversations"),
		author: v.union(v.literal("user"), v.literal("persona")),
		text: v.string(),
		/** AI coach analysis; absent until the coach action has run. */
		tips: v.optional(v.array(vCoachTip)),
		/** AI full-message rewrite; null means "already natural". */
		rewrite: v.optional(v.union(v.string(), v.null())),
		/** Why coach analysis failed for this message, when it did. */
		tipsError: v.optional(v.string()),
		/** True while the persona is still streaming this message. */
		streaming: v.optional(v.boolean()),
	}).index("by_conversation", ["conversationId"]),

	/** One row per OpenRouter call; per-user rollups live in usageTotals. */
	aiUsage: defineTable({
		userId: v.id("users"),
		conversationId: v.optional(v.id("conversations")),
		/** Call site: persona-reply, persona-opener, coach-submission, coach-gems, prepare. */
		kind: v.string(),
		model: v.string(),
		promptTokens: v.number(),
		completionTokens: v.number(),
		/** USD, from OpenRouter usage accounting. */
		cost: v.number(),
	}).index("by_user", ["userId"]),

	/** Denormalized per-user counters; read by the admin analytics overview. */
	usageTotals: defineTable({
		userId: v.id("users"),
		/** Lifetime count; deleting a conversation does not erase usage. */
		conversations: v.number(),
		messagesSent: v.number(),
		requests: v.number(),
		promptTokens: v.number(),
		completionTokens: v.number(),
		cost: v.number(),
		lastActiveAt: v.number(),
		/** UTC day (floor(now / 86400000)) that messagesToday counts within. */
		dayKey: v.optional(v.number()),
		/** User messages sent during dayKey; the free-plan daily quota. */
		messagesToday: v.optional(v.number()),
	}).index("by_user", ["userId"]),

	/** Admin prompt overrides; defaults live in convex/prompts.ts. */
	prompts: defineTable({
		key: v.string(),
		template: v.string(),
	}).index("by_key", ["key"]),

	aiConfig: defineTable({
		model: v.string(),
		temperature: v.number(),
		/** Deprecated and unread; kept so old rows validate. */
		maxTokens: v.optional(v.number()),
		/** Extra instructions appended to every persona system prompt. */
		systemPrompt: v.string(),
		/** Model for coach analysis; falls back to model. */
		coachModel: v.optional(v.string()),
		/** OpenRouter provider pin for the main model; empty means auto. */
		provider: v.optional(v.string()),
		/** Provider pin for the coach model; only used when coachModel is set. */
		coachProvider: v.optional(v.string()),
		/** Model for the prepare interview; falls back to the coach chain. */
		prepareModel: v.optional(v.string()),
		/** Thinking: "" = model default, "off", or "low"|"medium"|"high". */
		reasoning: v.optional(v.string()),
		coachReasoning: v.optional(v.string()),
		prepareReasoning: v.optional(v.string()),
		/** User messages per UTC day on the free plan; 0 = unlimited. */
		dailyMessageLimit: v.optional(v.number()),
		/** Deprecated and unread; kept so old rows validate. */
		liveModel: v.optional(v.string()),
	}),
});
