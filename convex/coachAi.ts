import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { modelFor } from "./aiConfig";
import { chatJson, type TokenUsage } from "./openrouter";
import { renderPrompt } from "./prompts";

// Coach analysis, stored on the message: fixes/tone/rewrite for learner
// messages, gem phrases for persona replies. Spans are anchored here from
// the model's verbatim quotes; models can't count characters.

interface RawTip {
	kind?: string;
	quote?: string;
	title?: string;
	detail?: string;
	correction?: string;
}

const TIP_KINDS = new Set(["fix", "tip", "tone"]);

// Prefers a whole-word match: "im" must not anchor inside "time".
function anchor(text: string, quote: string): [number, number] | null {
	const escaped = quote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const boundary = new RegExp(
		`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,
		"u",
	);
	const match = boundary.exec(text);
	const start = match ? match.index : text.indexOf(quote);
	if (start === -1) return null;
	return [start, start + quote.length];
}

function submissionPrompt(context: {
	prompts: { coachSubmission: string };
	platformLabel: string;
	topic: string;
	persona: { name: string; role: string };
}): string {
	return renderPrompt(context.prompts.coachSubmission, {
		personaName: context.persona.name,
		personaRole: context.persona.role.toLowerCase(),
		platformLabel: context.platformLabel,
		topic: context.topic,
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

export const analyzeMessage = internalAction({
	args: { messageId: v.id("messages") },
	handler: async (ctx, args) => {
		const context = await ctx.runQuery(internal.conversations.messageContext, {
			messageId: args.messageId,
		});
		if (!context) return;
		const { message, config } = context;
		const coach = modelFor(config, "coach");
		const recordUsage =
			(kind: string) => async (usage: TokenUsage) => {
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
					temperature: 0.3,
					label: "coach-submission",
					onUsage: recordUsage("coach-submission"),
					messages: [
						{ role: "system", content: submissionPrompt(context) },
						{ role: "user", content: message.text },
					],
				});
				const tips = (result.tips ?? [])
					.filter(
						(t): t is Required<Pick<RawTip, "kind" | "quote" | "detail">> &
							RawTip =>
							Boolean(t.quote && t.detail && t.kind && TIP_KINDS.has(t.kind)),
					)
					.flatMap((t) => {
						const span = anchor(message.text, t.quote);
						if (!span) return [];
						return [
							{
								kind: t.kind as "fix" | "tip" | "tone",
								start: span[0],
								end: span[1],
								title: (t.title || "Worth a look").slice(0, 60),
								detail: t.detail,
								quote: t.quote,
								correction: t.correction || undefined,
							},
						];
					})
					.slice(0, 3);
				const rewrite =
					typeof result.rewrite === "string" &&
					result.rewrite.trim() &&
					result.rewrite.trim() !== message.text.trim()
						? result.rewrite.trim()
						: null;
				await ctx.runMutation(internal.conversations.storeAnalysis, {
					messageId: args.messageId,
					tips,
					rewrite,
				});
			} else {
				const result = await chatJson<{ gems?: RawTip[] }>({
					...coach,
					temperature: 0.3,
					label: "coach-gems",
					onUsage: recordUsage("coach-gems"),
					messages: [
						{ role: "system", content: gemsPrompt(context) },
						{ role: "user", content: message.text },
					],
				});
				const tips = (result.gems ?? [])
					.filter((g) => Boolean(g.quote && g.detail))
					.flatMap((g) => {
						const span = anchor(message.text, g.quote as string);
						if (!span) return [];
						return [
							{
								kind: "gem" as const,
								start: span[0],
								end: span[1],
								title: "Worth stealing",
								detail: g.detail as string,
								quote: g.quote as string,
							},
						];
					})
					.slice(0, 2);
				await ctx.runMutation(internal.conversations.storeAnalysis, {
					messageId: args.messageId,
					tips,
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
