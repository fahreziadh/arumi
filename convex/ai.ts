import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { type ActionCtx, internalAction } from "./_generated/server";
import { modelFor } from "./aiConfig";
import { type ChatMessage, chatStream } from "./openrouter";
import { renderPrompt } from "./prompts";

const FLUSH_MS = 150;

interface ReplyContext {
	userId: Id<"users">;
	platform: string;
	prompts: { personaSystem: string; openerInstruction: string };
	persona: { name: string; role: string };
	platformLabel: string;
	topic: string;
	messages: Array<{ author: "user" | "persona"; text: string }>;
	config: Parameters<typeof modelFor>[0];
}

// Chat platforms are plain text in real life; models still emit markdown
// sometimes, so it is stripped. Email and issue rooms render it instead.
function toPlainChat(text: string): string {
	return text
		.replace(/```[a-z]*\n?/g, "")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
		.replace(/(\*\*|__)(.+?)\1/g, "$2")
		.replace(/(^|\s)\*(\S(?:[^*\n]*\S)?)\*(?=[\s.,!?]|$)/g, "$1$2")
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/`([^`]+)`/g, "$1");
}

function personaSystem(context: ReplyContext): string {
	return renderPrompt(context.prompts.personaSystem, {
		personaName: context.persona.name,
		personaRole: context.persona.role.toLowerCase(),
		platformLabel: context.platformLabel,
		topic: context.topic,
		extra: context.config.systemPrompt,
	});
}

async function streamPersonaMessage(
	ctx: ActionCtx,
	conversationId: Id<"conversations">,
	context: ReplyContext,
	label: string,
	messages: ChatMessage[],
): Promise<void> {
	let messageId: Id<"messages"> | null = null;
	const renders = context.platform === "email" || context.platform === "github";
	const clean = (text: string) => (renders ? text : toPlainChat(text));
	const slot = modelFor(context.config, "persona");
	try {
		let lastFlush = 0;
		const final = await chatStream(
			{
				...slot,
				temperature: context.config.temperature,
				label,
				messages,
				onUsage: async (usage) => {
					await ctx.runMutation(internal.usage.record, {
						userId: context.userId,
						conversationId,
						kind: label,
						model: slot.model,
						...usage,
					});
				},
			},
			async (text) => {
				const now = Date.now();
				if (messageId === null) {
					messageId = await ctx.runMutation(internal.conversations.startReply, {
						conversationId,
						text: clean(text),
					});
					lastFlush = now;
				} else if (now - lastFlush >= FLUSH_MS) {
					lastFlush = now;
					await ctx.runMutation(internal.conversations.appendReply, {
						messageId,
						text: clean(text),
					});
				}
			},
		);
		if (messageId === null) {
			messageId = await ctx.runMutation(internal.conversations.startReply, {
				conversationId,
				text: clean(final),
			});
		}
		await ctx.runMutation(internal.conversations.finishReply, {
			messageId,
			text: clean(final),
		});
	} catch (error) {
		console.error("Persona generation failed", error);
		await ctx.runMutation(internal.conversations.abortReply, {
			conversationId,
			messageId: messageId ?? undefined,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

export const generateReply = internalAction({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const context = await ctx.runQuery(internal.conversations.replyContext, {
			conversationId: args.conversationId,
		});
		if (!context) return;
		await streamPersonaMessage(ctx, args.conversationId, context, "persona-reply", [
			{ role: "system", content: personaSystem(context) },
			// The persona is the assistant; the learner is the user.
			...context.messages.map((m) => ({
				role: (m.author === "user" ? "user" : "assistant") as
					| "user"
					| "assistant",
				content: m.text,
			})),
		]);
	},
});

export const generateOpener = internalAction({
	args: { conversationId: v.id("conversations") },
	handler: async (ctx, args) => {
		const context = await ctx.runQuery(internal.conversations.replyContext, {
			conversationId: args.conversationId,
		});
		if (!context) return;
		await streamPersonaMessage(ctx, args.conversationId, context, "persona-opener", [
			{ role: "system", content: personaSystem(context) },
			{
				role: "user",
				content: renderPrompt(context.prompts.openerInstruction, {}),
			},
		]);
	},
});
