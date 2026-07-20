import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	mutation,
	type MutationCtx,
	query,
	type QueryCtx,
} from "./_generated/server";
import { withDefaults } from "./aiConfig";
import { personas } from "./personas";
import { loadPrompts } from "./prompts";
import { vCoachTip, vPlatform } from "./schema";
import { analysisDelta, bumpDaily, bumpPlatform, dayKeyOf } from "./stats";
import { assertUnderDailyLimit, bumpTotals } from "./usage";

async function requireUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
	const userId = await getAuthUserId(ctx);
	if (!userId) throw new Error("Not authenticated");
	return userId;
}

async function requireOwned(
	ctx: QueryCtx | MutationCtx,
	conversationId: Id<"conversations">,
): Promise<Doc<"conversations">> {
	const userId = await requireUserId(ctx);
	const conversation = await ctx.db.get(conversationId);
	if (!conversation || conversation.userId !== userId) {
		throw new Error("Conversation not found");
	}
	return conversation;
}

/** Shape the UI consumes; mirrors src/lib/types.ts Conversation. */
function toSummary(doc: Doc<"conversations">) {
	return {
		id: doc._id,
		platform: doc.platform,
		platformLabel: doc.platformLabel,
		topic: doc.topic,
		persona: { name: doc.personaName, role: doc.personaRole },
		createdAt: doc._creationTime,
	};
}

export const list = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return [];
		const docs = await ctx.db
			.query("conversations")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.order("desc")
			.collect();
		return docs.map(toSummary);
	},
});

export const get = query({
	// String id: stale URLs read as not-found instead of throwing.
	args: { conversationId: v.string() },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;
		const conversationId = ctx.db.normalizeId(
			"conversations",
			args.conversationId,
		);
		if (!conversationId) return null;
		const doc = await ctx.db.get(conversationId);
		if (!doc || doc.userId !== userId) return null;
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", conversationId),
			)
			.collect();
		return {
			...toSummary(doc),
			typing: doc.typing,
			aiError: doc.aiError ?? null,
			messages: messages.map((m) => ({
				id: m._id,
				author: m.author,
				text: m.text,
				at: m._creationTime,
				tips: m.tips,
				rewrite: m.rewrite,
				tipsError: m.tipsError ?? null,
				streaming: m.streaming ?? false,
			})),
		};
	},
});

export const create = mutation({
	args: {
		platform: vPlatform,
		platformLabel: v.string(),
		topic: v.string(),
		personaName: v.optional(v.string()),
		personaRole: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const userId = await requireUserId(ctx);
		await assertUnderDailyLimit(ctx, userId);
		const fallback = personas[args.platform];
		const conversationId = await ctx.db.insert("conversations", {
			userId,
			platform: args.platform,
			platformLabel: args.platformLabel,
			topic: args.topic,
			personaName: args.personaName?.trim() || fallback.name,
			personaRole: args.personaRole?.trim() || fallback.role,
			typing: true,
		});
		await bumpTotals(ctx, userId, { conversations: 1 });
		const day = dayKeyOf(Date.now());
		await bumpDaily(ctx, userId, day, { conversations: 1 });
		await bumpPlatform(ctx, userId, args.platform, { conversations: 1 });
		await ctx.scheduler.runAfter(0, internal.ai.generateOpener, {
			conversationId,
		});
		return conversationId;
	},
});

export const remove = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		await requireOwned(ctx, args.conversationId);
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", args.conversationId),
			)
			.collect();
		for (const message of messages) {
			await ctx.db.delete(message._id);
		}
		await ctx.db.delete(args.conversationId);
	},
});

export const send = mutation({
	args: {
		conversationId: v.id("conversations"),
		text: v.string(),
		fromCoachRewrite: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const text = args.text.trim();
		if (!text) return;
		const conversation = await requireOwned(ctx, args.conversationId);
		await assertUnderDailyLimit(ctx, conversation.userId);
		const fromCoachRewrite = args.fromCoachRewrite === true;
		const messageId = await ctx.db.insert("messages", {
			conversationId: args.conversationId,
			author: "user",
			text,
			...(fromCoachRewrite
				? { fromCoachRewrite: true, tips: [], rewrite: null }
				: {}),
		});
		await bumpTotals(ctx, conversation.userId, { messagesSent: 1 });
		await bumpDaily(ctx, conversation.userId, dayKeyOf(Date.now()), {
			messagesSent: 1,
		});
		if (!fromCoachRewrite) {
			await ctx.scheduler.runAfter(0, internal.coachAi.analyzeMessage, {
				messageId,
			});
		}
		const lastReply = await ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", args.conversationId),
			)
			.order("desc")
			.first();
		// One reply at a time; a streaming or pending one gets to land first.
		const busy =
			conversation.typing ||
			(lastReply?.author === "persona" && lastReply.streaming);
		if (!busy) {
			await ctx.db.patch(args.conversationId, {
				typing: true,
				aiError: undefined,
			});
			await ctx.scheduler.runAfter(0, internal.ai.generateReply, {
				conversationId: args.conversationId,
			});
		}
	},
});

/** Re-runs the failed generation: opener if none exists, else the reply. */
export const retryReply = mutation({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const conversation = await requireOwned(ctx, args.conversationId);
		if (conversation.typing || !conversation.aiError) return;
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", args.conversationId),
			)
			.collect();
		await ctx.db.patch(args.conversationId, {
			typing: true,
			aiError: undefined,
		});
		const target =
			messages.length === 0
				? internal.ai.generateOpener
				: internal.ai.generateReply;
		await ctx.scheduler.runAfter(0, target, {
			conversationId: args.conversationId,
		});
	},
});

export const retryAnalysis = mutation({
	args: { messageId: v.id("messages") },
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) throw new Error("Message not found");
		await requireOwned(ctx, message.conversationId);
		if (!message.tipsError) return;
		await ctx.db.patch(args.messageId, { tipsError: undefined });
		await ctx.scheduler.runAfter(0, internal.coachAi.analyzeMessage, {
			messageId: args.messageId,
		});
	},
});

export const startReply = internalMutation({
	args: { conversationId: v.id("conversations"), text: v.string() },
	handler: async (ctx, args) => {
		const messageId = await ctx.db.insert("messages", {
			conversationId: args.conversationId,
			author: "persona",
			text: args.text,
			streaming: true,
		});
		await ctx.db.patch(args.conversationId, { typing: false });
		return messageId;
	},
});

export const appendReply = internalMutation({
	args: { messageId: v.id("messages"), text: v.string() },
	handler: async (ctx, args) => {
		if (await ctx.db.get(args.messageId)) {
			await ctx.db.patch(args.messageId, { text: args.text });
		}
	},
});

export const finishReply = internalMutation({
	args: { messageId: v.id("messages"), text: v.string() },
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return;
		await ctx.db.patch(args.messageId, { text: args.text, streaming: false });
		await ctx.db.patch(message.conversationId, {
			typing: false,
			aiError: undefined,
		});
		await ctx.scheduler.runAfter(0, internal.coachAi.analyzeMessage, {
			messageId: args.messageId,
		});
	},
});

// A partial bubble would block send's busy check forever, so it is deleted.
export const abortReply = internalMutation({
	args: {
		conversationId: v.id("conversations"),
		messageId: v.optional(v.id("messages")),
		error: v.string(),
	},
	handler: async (ctx, args) => {
		if (args.messageId && (await ctx.db.get(args.messageId))) {
			await ctx.db.delete(args.messageId);
		}
		if (!(await ctx.db.get(args.conversationId))) return;
		await ctx.db.patch(args.conversationId, {
			typing: false,
			aiError: args.error.slice(0, 300),
		});
	},
});

/** Everything the reply generator needs, in one round trip. */
export const replyContext = internalQuery({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const conversation = await ctx.db.get(args.conversationId);
		if (!conversation) return null;
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_conversation", (q) =>
				q.eq("conversationId", args.conversationId),
			)
			.collect();
		const config = withDefaults(await ctx.db.query("aiConfig").first());
		return {
			userId: conversation.userId,
			platform: conversation.platform,
			prompts: await loadPrompts(ctx.db),
			platformLabel: conversation.platformLabel,
			topic: conversation.topic,
			persona: {
				name: conversation.personaName,
				role: conversation.personaRole,
			},
			messages: messages.map((m) => ({ author: m.author, text: m.text })),
			config,
		};
	},
});

export const aiConfigForActions = internalQuery({
	args: {},
	handler: async (ctx) => withDefaults(await ctx.db.query("aiConfig").first()),
});

export const promptsForActions = internalQuery({
	args: {},
	handler: async (ctx) => loadPrompts(ctx.db),
});

const COACH_HISTORY_MESSAGES = 8;

/**
 * The exchange leading up to a message, oldest first. Register is a property
 * of the conversation, not of a sentence, so the coach needs this to avoid
 * re-deciding what "too casual" means on every message.
 */
async function recentHistory(
	ctx: QueryCtx,
	conversationId: Id<"conversations">,
	beforeCreationTime = Number.MAX_SAFE_INTEGER,
): Promise<Array<{ author: string; text: string }>> {
	const messages = await ctx.db
		.query("messages")
		.withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
		.order("desc")
		.take(COACH_HISTORY_MESSAGES + 1);
	return messages
		.filter((m) => m._creationTime < beforeCreationTime)
		.reverse()
		.map((m) => ({ author: m.author, text: m.text }));
}

export const messageContext = internalQuery({
	args: { messageId: v.id("messages") },
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return null;
		const conversation = await ctx.db.get(message.conversationId);
		if (!conversation) return null;
		const config = withDefaults(await ctx.db.query("aiConfig").first());
		return {
			userId: conversation.userId,
			conversationId: conversation._id,
			message: { author: message.author, text: message.text },
			history: await recentHistory(
				ctx,
				conversation._id,
				message._creationTime,
			),
			prompts: await loadPrompts(ctx.db),
			platformLabel: conversation.platformLabel,
			topic: conversation.topic,
			persona: {
				name: conversation.personaName,
				role: conversation.personaRole,
			},
			config,
		};
	},
});

/**
 * Returns null rather than throwing when the caller does not own the room, so
 * a stale composer goes quiet instead of surfacing an error over the input.
 */
export const draftContext = internalQuery({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const userId = await getAuthUserId(ctx);
		if (!userId) return null;
		const conversation = await ctx.db.get(args.conversationId);
		if (!conversation || conversation.userId !== userId) return null;
		const config = withDefaults(await ctx.db.query("aiConfig").first());
		return {
			userId,
			conversationId: conversation._id,
			history: await recentHistory(ctx, conversation._id),
			prompts: await loadPrompts(ctx.db),
			platformLabel: conversation.platformLabel,
			topic: conversation.topic,
			persona: {
				name: conversation.personaName,
				role: conversation.personaRole,
			},
			config,
		};
	},
});

export const storeAnalysis = internalMutation({
	args: {
		messageId: v.id("messages"),
		tips: v.array(vCoachTip),
		rewrite: v.union(v.string(), v.null()),
	},
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return;
		// Absent tips means never analyzed, not clean. Re-analysis of a message
		// that already has marks must leave the rollups alone or it double-counts.
		const alreadyAnalyzed = message.tips !== undefined;
		await ctx.db.patch(args.messageId, {
			tips: args.tips,
			rewrite: args.rewrite,
			tipsError: undefined,
		});
		if (alreadyAnalyzed) return;
		const conversation = await ctx.db.get(message.conversationId);
		if (!conversation) return;
		const { daily, platform } = analysisDelta(message.author, args.tips);
		await bumpDaily(
			ctx,
			conversation.userId,
			dayKeyOf(message._creationTime),
			daily,
		);
		if (platform.analyzed) {
			await bumpPlatform(
				ctx,
				conversation.userId,
				conversation.platform,
				platform,
			);
		}
	},
});

export const failAnalysis = internalMutation({
	args: { messageId: v.id("messages"), error: v.string() },
	handler: async (ctx, args) => {
		const message = await ctx.db.get(args.messageId);
		if (!message) return;
		await ctx.db.patch(args.messageId, {
			tipsError: args.error.slice(0, 300),
		});
	},
});
