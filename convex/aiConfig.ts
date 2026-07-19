import type { Doc } from "./_generated/dataModel";

// Defaults double as the first-run seed; /admin edits the aiConfig row.
export const DEFAULT_AI_CONFIG = {
	model: "anthropic/claude-haiku-4.5",
	temperature: 0.8,
	systemPrompt: "",
	/** Empty string means "use the main model". */
	coachModel: "",
	/** OpenRouter provider pins; empty string means auto routing. */
	provider: "",
	coachProvider: "",
	/** Empty string means "use the coach chain". */
	prepareModel: "",
	// Thinking: "" = model default, "off", or effort "low"|"medium"|"high".
	reasoning: "",
	coachReasoning: "",
	prepareReasoning: "",
	/** User messages per UTC day; 0 = unlimited. */
	dailyMessageLimit: 30,
};

export type AiConfig = typeof DEFAULT_AI_CONFIG;

export function withDefaults(doc: Doc<"aiConfig"> | null): AiConfig {
	if (!doc) return DEFAULT_AI_CONFIG;
	return {
		model: doc.model,
		temperature: doc.temperature,
		systemPrompt: doc.systemPrompt,
		coachModel: doc.coachModel ?? "",
		provider: doc.provider ?? "",
		coachProvider: doc.coachProvider ?? "",
		prepareModel: doc.prepareModel ?? "",
		reasoning: doc.reasoning ?? "",
		coachReasoning: doc.coachReasoning ?? "",
		prepareReasoning: doc.prepareReasoning ?? "",
		dailyMessageLimit:
			doc.dailyMessageLimit ?? DEFAULT_AI_CONFIG.dailyMessageLimit,
	};
}

export type AiFeature = "persona" | "coach" | "prepare";

// Fallback chain: coach inherits main, prepare inherits coach.
export function modelFor(
	config: AiConfig,
	feature: AiFeature,
): { model: string; provider: string; reasoning: string } {
	const persona = {
		model: config.model,
		provider: config.provider,
		reasoning: config.reasoning,
	};
	const coach = config.coachModel
		? {
				model: config.coachModel,
				provider: config.coachProvider,
				reasoning: config.coachReasoning,
			}
		: persona;
	switch (feature) {
		case "persona":
			return persona;
		case "coach":
			return coach;
		case "prepare":
			return config.prepareModel
				? {
						model: config.prepareModel,
						provider: "",
						reasoning: config.prepareReasoning,
					}
				: coach;
	}
}
