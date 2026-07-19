import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { modelFor } from "./aiConfig";
import { chatJson } from "./openrouter";
import { renderPrompt } from "./prompts";
import { vPlatform } from "./schema";
import { DAY_MS } from "./usage";

// The pre-session interview: one clarifying question at a time, or done
// with a topic summary. The 3-follow-up budget is enforced here, never
// trusted to the model.

export const MAX_FOLLOW_UPS = 3;

interface NextResult {
	done: boolean;
	question?: string;
	topic?: string;
	/** Who the persona will play: the other person in the scenario. */
	partnerName?: string;
	partnerRole?: string;
}

export const next = action({
	args: {
		platform: vPlatform,
		platformLabel: v.string(),
		exchanges: v.array(v.object({ question: v.string(), answer: v.string() })),
	},
	handler: async (ctx, args): Promise<NextResult> => {
		const userId = await getAuthUserId(ctx);
		if (!userId) throw new Error("Not authenticated");
		// Prepare turns don't spend the daily quota, but a maxed-out user
		// can't start setting up a session they couldn't run.
		await ctx.runQuery(internal.usage.assertUnderLimit, {
			userId,
			dayKey: Math.floor(Date.now() / DAY_MS),
		});
		if (args.exchanges.length === 0) {
			throw new Error("Answer the first question before asking for the next");
		}

		const followUpsAsked = args.exchanges.length - 1;
		const outOfQuestions = followUpsAsked >= MAX_FOLLOW_UPS;

		const config = await ctx.runQuery(
			internal.conversations.aiConfigForActions,
		);
		const prompts = await ctx.runQuery(
			internal.conversations.promptsForActions,
		);

		const system = [
			renderPrompt(prompts.prepareInterview, {
				platformLabel: args.platformLabel,
				followUpsLeft: String(MAX_FOLLOW_UPS - followUpsAsked),
			}),
			outOfQuestions
				? 'You have NO follow-up questions left. You MUST respond with {"clear":true,"topic":"..."} using the best summary of what you know.'
				: "",
		]
			.filter(Boolean)
			.join("\n");

		const slot = modelFor(config, "prepare");
		const result = await chatJson<{
			clear?: boolean;
			question?: string;
			topic?: string;
			partnerName?: string;
			partnerRole?: string;
		}>({
			...slot,
			temperature: 0.4,
			label: "prepare",
			onUsage: async (usage) => {
				await ctx.runMutation(internal.usage.record, {
					userId,
					kind: "prepare",
					model: slot.model,
					...usage,
				});
			},
			messages: [
				{ role: "system", content: system },
				{
					role: "user",
					content: args.exchanges
						.map((e) => `Q: ${e.question}\nA: ${e.answer}`)
						.join("\n\n"),
				},
			],
		});

		if (result.clear && result.topic?.trim()) {
			return {
				done: true,
				topic: result.topic.trim(),
				partnerName: result.partnerName?.trim() || undefined,
				partnerRole: result.partnerRole?.trim() || undefined,
			};
		}
		if (!outOfQuestions && result.question?.trim()) {
			return { done: false, question: result.question.trim() };
		}
		throw new Error(
			"The model did not return a usable step (expected a question or a topic)",
		);
	},
});
