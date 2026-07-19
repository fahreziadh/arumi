import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

export interface ChatMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface TokenUsage {
	promptTokens: number;
	completionTokens: number;
	/** USD, as accounted by OpenRouter for this request. */
	cost: number;
}

export interface ChatOptions {
	model: string;
	temperature: number;
	messages: ChatMessage[];
	/** OpenRouter provider name to pin routing to; omit/empty for auto. */
	provider?: string;
	/** Thinking: "" = model default, "off" = disabled, or "low"|"medium"|"high". */
	reasoning?: string;
	/** Feature name for the timing log, e.g. "coach-submission". */
	label?: string;
	/** Called once with token counts and cost when the response reports them. */
	onUsage?: (usage: TokenUsage) => Promise<void>;
}

export function openRouterKey(): string | undefined {
	return process.env.OPENROUTER_API_KEY;
}

const APP_HEADERS = {
	"HTTP-Referer": "https://github.com/fahreziadh/arumi",
	"X-Title": "Arumi",
};

function noTextError(model: string, finish: string, reasoned: boolean): Error {
	return new Error(
		`Model "${model}" returned no text (finish reason: ${finish}${
			reasoned ? "; it only produced hidden reasoning" : ""
		}). Pick a different model in /admin.`,
	);
}

async function completionsRequest(
	options: ChatOptions,
	stream: boolean,
): Promise<Response> {
	const apiKey = openRouterKey();
	if (!apiKey) {
		throw new Error(
			"OPENROUTER_API_KEY is not set on this Convex deployment. Set it with: npx convex env set OPENROUTER_API_KEY sk-or-…",
		);
	}
	const response = await fetch(
		"https://openrouter.ai/api/v1/chat/completions",
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
				...APP_HEADERS,
			},
			body: JSON.stringify({
				model: options.model,
				temperature: options.temperature,
				// No max_tokens: models stop naturally, so thinking can never
				// starve the reply. Prompts bound the length instead.
				messages: options.messages,
				stream,
				// Returns token counts and cost on the final stream chunk.
				usage: { include: true },
				...(options.reasoning === "off"
					? { reasoning: { enabled: false, exclude: true } }
					: options.reasoning
						? { reasoning: { effort: options.reasoning, exclude: true } }
						: {}),
				// Auto mode routes by price; this app wants the fastest host.
				provider: options.provider
					? { order: [options.provider], allow_fallbacks: false }
					: { sort: "latency" },
			}),
		},
	);
	if (!response.ok) {
		throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
	}
	return response;
}

export async function chatStream(
	options: ChatOptions,
	onText: (text: string) => Promise<void>,
): Promise<string> {
	const startedAt = Date.now();
	const response = await completionsRequest(options, true);
	if (!response.body) throw new Error("OpenRouter returned no stream");

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	let text = "";
	let finish = "unknown";
	let reasoned = false;
	let firstTokenAt = 0;
	let usage: TokenUsage | null = null;

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";
		for (const line of lines) {
			if (!line.startsWith("data: ")) continue;
			const payload = line.slice(6).trim();
			if (!payload || payload === "[DONE]") continue;
			const chunk = JSON.parse(payload) as {
				error?: { message?: string };
				usage?: {
					prompt_tokens?: number;
					completion_tokens?: number;
					cost?: number;
				};
				choices?: Array<{
					delta?: { content?: string; reasoning?: string | null };
					finish_reason?: string;
					native_finish_reason?: string;
				}>;
			};
			if (chunk.error) {
				throw new Error(chunk.error.message ?? "OpenRouter stream error");
			}
			if (chunk.usage) {
				usage = {
					promptTokens: chunk.usage.prompt_tokens ?? 0,
					completionTokens: chunk.usage.completion_tokens ?? 0,
					cost: chunk.usage.cost ?? 0,
				};
			}
			const choice = chunk.choices?.[0];
			if (choice?.native_finish_reason || choice?.finish_reason) {
				finish = choice.native_finish_reason || choice.finish_reason || finish;
			}
			if (choice?.delta?.reasoning) reasoned = true;
			if (choice?.delta?.content) {
				if (!firstTokenAt) firstTokenAt = Date.now();
				text += choice.delta.content;
				await onText(text);
			}
		}
	}

	// Tokens are billed even when the model returned no usable text.
	if (usage && options.onUsage) await options.onUsage(usage);

	const trimmed = text.trim();
	if (!trimmed) throw noTextError(options.model, finish, reasoned);
	if (options.label) {
		console.log(
			`${options.label}: first token ${firstTokenAt - startedAt}ms, total ${Date.now() - startedAt}ms, ${trimmed.length} chars, ${options.model}, thinking=${options.reasoning || "default"}`,
		);
	}
	return trimmed;
}

// Expects one JSON object back; tolerates prose or fences around it.
// Streams under the hood: same result, but logs first-token time and some
// hosts deliver sooner on streamed requests.
export async function chatJson<T>(options: ChatOptions): Promise<T> {
	const text = await chatStream(options, async () => {});
	const start = text.indexOf("{");
	const end = text.lastIndexOf("}");
	if (start === -1 || end <= start) {
		throw new Error(
			`Model did not return JSON (got: "${text.slice(0, 120)}…")`,
		);
	}
	try {
		return JSON.parse(text.slice(start, end + 1)) as T;
	} catch {
		throw new Error(
			`Model returned unparseable JSON (got: "${text.slice(0, 120)}…")`,
		);
	}
}

const OPENROUTER_API = "https://openrouter.ai/api/v1";

export interface CreditsInfo {
	totalCredits: number | null;
	totalUsage: number | null;
	keyLabel: string | null;
	keyLimit: number | null;
	keyLimitRemaining: number | null;
	isFreeTier: boolean;
}

export interface ModelInfo {
	id: string;
	name: string;
	description: string;
	contextLength: number | null;
	/** USD per token; multiply by 1e6 for the per-million price. */
	promptPrice: number | null;
	completionPrice: number | null;
	maxCompletionTokens: number | null;
	inputModalities: string[];
	supportedParameters: string[];
	isModerated: boolean;
}

export interface ProviderEndpoint {
	providerName: string;
	contextLength: number | null;
	maxCompletionTokens: number | null;
	promptPrice: number | null;
	completionPrice: number | null;
	/** Percentage over the last 30 minutes, e.g. 99.5. */
	uptime: number | null;
	quantization: string | null;
}

async function getData(path: string, apiKey?: string): Promise<unknown> {
	const response = await fetch(`${OPENROUTER_API}${path}`, {
		headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
	});
	if (!response.ok) {
		throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
	}
	const body = (await response.json()) as { data?: unknown };
	return body.data ?? null;
}

/** OpenRouter reports prices as numeric strings and usage as numbers. */
function asNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function asStrings(value: unknown): string[] {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];
}

export const credits = action({
	args: {},
	handler: async (ctx): Promise<CreditsInfo | null> => {
		await ctx.runQuery(internal.admin.assertAdmin, {});
		const apiKey = openRouterKey();
		if (!apiKey) return null;
		const [creditsData, keyData] = await Promise.all([
			getData("/credits", apiKey).catch(() => null),
			getData("/key", apiKey).catch(() => null),
		]);
		if (!creditsData && !keyData) {
			throw new Error("Could not reach OpenRouter");
		}
		const c = (creditsData ?? {}) as Record<string, unknown>;
		const k = (keyData ?? {}) as Record<string, unknown>;
		return {
			totalCredits: asNumber(c.total_credits),
			totalUsage: asNumber(c.total_usage),
			keyLabel: typeof k.label === "string" ? k.label : null,
			keyLimit: asNumber(k.limit),
			keyLimitRemaining: asNumber(k.limit_remaining),
			isFreeTier: k.is_free_tier === true,
		};
	},
});

export const models = action({
	args: {},
	handler: async (ctx): Promise<ModelInfo[]> => {
		await ctx.runQuery(internal.admin.assertAdmin, {});
		const data = await getData("/models");
		if (!Array.isArray(data)) return [];
		return data.flatMap((raw): ModelInfo[] => {
			const m = (raw ?? {}) as Record<string, unknown>;
			if (typeof m.id !== "string") return [];
			const pricing = (m.pricing ?? {}) as Record<string, unknown>;
			const top = (m.top_provider ?? {}) as Record<string, unknown>;
			const arch = (m.architecture ?? {}) as Record<string, unknown>;
			return [
				{
					id: m.id,
					name: typeof m.name === "string" ? m.name : m.id,
					description:
						typeof m.description === "string"
							? m.description.slice(0, 280)
							: "",
					contextLength: asNumber(m.context_length),
					promptPrice: asNumber(pricing.prompt),
					completionPrice: asNumber(pricing.completion),
					maxCompletionTokens: asNumber(top.max_completion_tokens),
					inputModalities: asStrings(arch.input_modalities),
					supportedParameters: asStrings(m.supported_parameters),
					isModerated: top.is_moderated === true,
				},
			];
		});
	},
});

export const modelEndpoints = action({
	args: { modelId: v.string() },
	handler: async (ctx, args): Promise<ProviderEndpoint[]> => {
		await ctx.runQuery(internal.admin.assertAdmin, {});
		// Variant suffixes like ":free" are not part of the endpoints path.
		const [author, slug] = args.modelId.split(":")[0].split("/");
		if (!author || !slug) return [];
		const data = await getData(`/models/${author}/${slug}/endpoints`).catch(
			() => null,
		);
		const endpoints = ((data ?? {}) as Record<string, unknown>).endpoints;
		if (!Array.isArray(endpoints)) return [];
		return endpoints.flatMap((raw): ProviderEndpoint[] => {
			const e = (raw ?? {}) as Record<string, unknown>;
			if (typeof e.provider_name !== "string") return [];
			const pricing = (e.pricing ?? {}) as Record<string, unknown>;
			return [
				{
					providerName: e.provider_name,
					contextLength: asNumber(e.context_length),
					maxCompletionTokens: asNumber(e.max_completion_tokens),
					promptPrice: asNumber(pricing.prompt),
					completionPrice: asNumber(pricing.completion),
					uptime: asNumber(e.uptime_last_30m),
					quantization:
						typeof e.quantization === "string" ? e.quantization : null,
				},
			];
		});
	},
});
