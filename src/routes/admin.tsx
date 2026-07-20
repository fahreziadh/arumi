import { createFileRoute } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import {
	ArrowUpRight,
	Check,
	ChevronDown,
	GripVertical,
	Plus,
	RefreshCw,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { RequireAuth } from "@/components/auth-gate";
import { LoadingScreen } from "@/components/loading-screen";
import { NotFoundState } from "@/components/not-found-state";
import { PlatformTile } from "@/components/platform-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Platform } from "@/lib/types";
import { useCases } from "@/lib/use-cases";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type {
	CreditsInfo,
	ModelInfo,
	ProviderEndpoint,
} from "../../convex/openrouter";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
	return (
		<RequireAuth>
			<AdminGate />
		</RequireAuth>
	);
}

function AdminGate() {
	const isAdmin = useQuery(api.admin.isAdmin);
	if (isAdmin === undefined) return <LoadingScreen />;
	if (!isAdmin) {
		return (
			<NotFoundState
				title="There's nothing here."
				description="This page doesn't exist for your account."
			/>
		);
	}
	return <AdminPanel />;
}

function formatUsd(amount: number): string {
	return `$${amount.toFixed(2)}`;
}

/** Cost of a single user's usage; sub-cent amounts stay visible. */
function formatCost(amount: number): string {
	if (amount === 0) return "$0.00";
	if (amount < 0.01) return "<$0.01";
	return formatUsd(amount);
}

function timeAgo(timestamp: number): string {
	const seconds = Math.floor((Date.now() - timestamp) / 1000);
	if (seconds < 60) return "just now";
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	if (months < 12) return `${months}mo ago`;
	return `${Math.floor(months / 12)}y ago`;
}

/** Per-million-token price label from OpenRouter's USD-per-token rate. */
function priceLabel(perToken: number | null): string {
	if (perToken === null) return "Unknown";
	if (perToken === 0) return "Free";
	const perMillion = perToken * 1_000_000;
	const digits = perMillion >= 100 ? 0 : perMillion >= 1 ? 2 : 3;
	return `$${perMillion.toFixed(digits)}/M`;
}

function formatTokenCount(count: number | null): string {
	if (count === null) return "Unknown";
	if (count >= 1_000_000) return `${Math.round(count / 100_000) / 10}M`;
	if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
	return String(count);
}

function ExternalTextLink({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="inline-flex items-center gap-0.5 text-muted-foreground transition-colors hover:text-foreground"
		>
			{children}
			<ArrowUpRight className="size-3" aria-hidden="true" />
		</a>
	);
}

const THINKING_OPTIONS = [
	{ value: "", label: "Model default" },
	{ value: "off", label: "Off" },
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
];

function ThinkingPicker({
	value,
	onChange,
	model,
}: {
	value: string;
	onChange: (value: string) => void;
	model?: ModelInfo;
}) {
	const unsupported =
		model !== undefined &&
		!model.supportedParameters.some(
			(p) => p === "reasoning" || p === "include_reasoning",
		);
	return (
		<div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
			<span className="font-medium text-muted-foreground text-xs">
				Thinking
			</span>
			<span className="flex flex-wrap gap-1">
				{THINKING_OPTIONS.map((option) => (
					<button
						key={option.value}
						type="button"
						onClick={() => onChange(option.value)}
						className={cn(
							"rounded-full px-2.5 py-1 text-xs transition-colors",
							value === option.value
								? "bg-foreground text-background"
								: "bg-muted/60 text-muted-foreground hover:bg-muted",
						)}
					>
						{option.label}
					</button>
				))}
			</span>
			{unsupported && (
				<span className="text-muted-foreground text-xs">
					ignored by this model
				</span>
			)}
		</div>
	);
}

const ADMIN_TABS = [
	{ key: "analytics", label: "Analytics" },
	{ key: "settings", label: "AI settings" },
	{ key: "prompts", label: "Prompts" },
	{ key: "templates", label: "Templates" },
] as const;

type AdminTab = (typeof ADMIN_TABS)[number]["key"];

function AdminPanel() {
	const [tab, setTab] = useState<AdminTab>("analytics");
	return (
		<div className="min-h-dvh">
			<AppHeader />
			<main className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-6">
				<h1 className="font-bold text-2xl tracking-tight">Admin</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Usage, models, prompts, and templates. Users never see any of this.
				</p>
				<nav aria-label="Admin sections" className="mt-5 flex flex-wrap gap-1">
					{ADMIN_TABS.map((option) => (
						<button
							key={option.key}
							type="button"
							onClick={() => setTab(option.key)}
							aria-current={tab === option.key ? "page" : undefined}
							className={cn(
								"rounded-full px-3.5 py-1.5 text-sm transition-colors",
								tab === option.key
									? "bg-foreground text-background"
									: "bg-muted/60 text-muted-foreground hover:bg-muted",
							)}
						>
							{option.label}
						</button>
					))}
				</nav>
				{/* Panels stay mounted so switching tabs never drops unsaved edits. */}
				<div className={cn(tab !== "analytics" && "hidden")}>
					<AnalyticsTab />
				</div>
				<div className={cn(tab !== "settings" && "hidden")}>
					<SettingsTab />
				</div>
				<div className={cn(tab !== "prompts" && "hidden")}>
					<PromptsSection />
				</div>
				<div className={cn(tab !== "templates" && "hidden")}>
					<TemplatesSection />
				</div>
			</main>
		</div>
	);
}

interface UsageRow {
	id: string;
	name: string;
	email: string | null;
	image: string | null;
	joinedAt: number;
	conversations: number;
	messagesSent: number;
	requests: number;
	promptTokens: number;
	completionTokens: number;
	cost: number;
	lastActiveAt: number | null;
	dayKey: number | null;
	messagesToday: number;
	limitOverride: number | null;
}

function AnalyticsTab() {
	const overview = useQuery(api.admin.usageOverview);
	const users = overview?.users;

	const totals = useMemo(() => {
		if (!users) return null;
		return users.reduce(
			(acc, user) => ({
				conversations: acc.conversations + user.conversations,
				tokens: acc.tokens + user.promptTokens + user.completionTokens,
				cost: acc.cost + user.cost,
			}),
			{ conversations: 0, tokens: 0, cost: 0 },
		);
	}, [users]);

	return (
		<div className="mt-6">
			<dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatTile
					label="Users"
					value={users ? users.length.toLocaleString() : "—"}
				/>
				<StatTile
					label="Conversations"
					value={totals ? totals.conversations.toLocaleString() : "—"}
				/>
				<StatTile
					label="Tokens"
					value={totals ? formatTokenCount(totals.tokens) : "—"}
				/>
				<StatTile
					label="AI spend"
					value={totals ? formatCost(totals.cost) : "—"}
				/>
			</dl>
			<CreditsSection />
			<UsersSection users={users} limit={overview?.dailyMessageLimit ?? 0} />
		</div>
	);
}

function StatTile({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl bg-muted/40 p-4">
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="mt-1 font-semibold text-xl tracking-tight">{value}</dd>
		</div>
	);
}

function UsersSection({
	users,
	limit,
}: {
	users: UsageRow[] | undefined;
	limit: number;
}) {
	const todayKey = Math.floor(Date.now() / 86_400_000);
	const rebuild = useMutation(api.stats.rebuild);
	const [rebuilding, setRebuilding] = useState(false);

	/**
	 * Recomputes every daily and per-platform rollup from the messages already
	 * stored. Clears first, so running it twice cannot double-count, and needs
	 * no AI: the marks were saved when the coach originally ran.
	 */
	function RebuildStatsButton() {
		return (
			<Button
				variant="secondary"
				size="sm"
				disabled={rebuilding}
				onClick={() => {
					setRebuilding(true);
					void rebuild({}).finally(() =>
						// The work continues in scheduled batches after the call
						// resolves; the delay just stops double-clicks.
						window.setTimeout(() => setRebuilding(false), 3000),
					);
				}}
			>
				{rebuilding ? "Rebuilding…" : "Rebuild stats"}
			</Button>
		);
	}
	return (
		<section aria-label="Users" className="mt-8">
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-semibold text-lg tracking-tight">Users</h2>
				<RebuildStatsButton />
			</div>
			{users === undefined ? (
				<p className="mt-3 text-muted-foreground text-sm">Loading…</p>
			) : users.length === 0 ? (
				<p className="mt-3 text-muted-foreground text-sm">
					No one has signed up yet.
				</p>
			) : (
				<div className="mt-2">
					<div className="flex items-center gap-3 border-border/60 border-b py-2 text-muted-foreground text-xs">
						<span className="flex-1">User</span>
						<span className="w-24 pr-2.5 text-right">Today</span>
						<span className="w-14 text-right">Convos</span>
						<span className="w-16 text-right">Tokens</span>
						<span className="w-16 text-right">Spent</span>
					</div>
					{users.map((user) => (
						<UserRow
							key={user.id}
							user={user}
							limit={limit}
							todayKey={todayKey}
						/>
					))}
				</div>
			)}
		</section>
	);
}

function UserRow({
	user,
	limit,
	todayKey,
}: {
	user: UsageRow;
	limit: number;
	todayKey: number;
}) {
	const usedToday = user.dayKey === todayKey ? user.messagesToday : 0;
	return (
		<div className="-mx-2 group/user flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/40">
			{user.image ? (
				<img
					src={user.image}
					alt=""
					referrerPolicy="no-referrer"
					className="size-8 shrink-0 rounded-full"
				/>
			) : (
				<span
					aria-hidden="true"
					className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground text-xs"
				>
					{user.name.slice(0, 1).toUpperCase()}
				</span>
			)}
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium text-sm">{user.name}</span>
				<span className="block truncate text-muted-foreground text-xs">
					{[
						user.email,
						user.lastActiveAt
							? `active ${timeAgo(user.lastActiveAt)}`
							: `joined ${timeAgo(user.joinedAt)}`,
					]
						.filter(Boolean)
						.join(" · ")}
				</span>
			</span>
			<DailyLimitCell
				userId={user.id}
				usedToday={usedToday}
				override={user.limitOverride}
				globalLimit={limit}
			/>
			<span
				className="w-14 text-right text-sm tabular-nums"
				title={`${user.messagesSent.toLocaleString()} messages sent all-time`}
			>
				{user.conversations.toLocaleString()}
			</span>
			<span
				className="w-16 text-right text-sm tabular-nums"
				title={`${user.promptTokens.toLocaleString()} in · ${user.completionTokens.toLocaleString()} out · ${user.requests.toLocaleString()} requests`}
			>
				{formatTokenCount(user.promptTokens + user.completionTokens)}
			</span>
			<span className="w-16 text-right font-medium text-sm tabular-nums">
				{formatCost(user.cost)}
			</span>
		</div>
	);
}

/**
 * Today's usage, and the click target for granting this user a bigger quota
 * than everyone else. An empty field hands them back the global limit.
 */
function DailyLimitCell({
	userId,
	usedToday,
	override,
	globalLimit,
}: {
	userId: string;
	usedToday: number;
	override: number | null;
	globalLimit: number;
}) {
	const setLimit = useMutation(api.admin.setUserDailyLimit);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState("");
	const [error, setError] = useState<string | null>(null);

	const limit = override ?? globalLimit;

	function save() {
		const trimmed = draft.trim();
		const next = trimmed === "" ? null : Number(trimmed);
		if (next !== null && (!Number.isInteger(next) || next < 0)) {
			setError("Whole number, 0 or more");
			return;
		}
		setEditing(false);
		void setLimit({ userId: userId as Id<"users">, limit: next }).catch(
			(cause: Error) => setError(cause.message),
		);
	}

	if (editing) {
		return (
			<div className="flex w-24 justify-end">
				<Input
					autoFocus
					inputMode="numeric"
					aria-label="Daily message limit for this user"
					placeholder={String(globalLimit)}
					className="h-7 w-20 rounded-full px-3 text-right text-sm tabular-nums"
					value={draft}
					onChange={(event) => setDraft(event.target.value)}
					onBlur={save}
					onKeyDown={(event) => {
						if (event.key === "Enter") save();
						if (event.key === "Escape") setEditing(false);
					}}
				/>
			</div>
		);
	}

	const atLimit = limit > 0 && usedToday >= limit;
	return (
		<div className="flex w-24 justify-end">
			<button
				type="button"
				className={cn(
					"flex h-7 items-center gap-1.5 rounded-full border border-transparent px-2.5 text-sm tabular-nums transition-colors",
					"group-hover/user:border-border hover:bg-muted focus-visible:border-ring focus-visible:outline-none",
					atLimit
						? "border-destructive/25 bg-destructive/5 text-destructive"
						: usedToday === 0 && "text-muted-foreground",
				)}
				title={
					error ??
					(override === null
						? "Messages sent today. Click to give this user their own daily limit."
						: `Custom limit: ${override === 0 ? "unlimited" : override} a day. Clear the field to follow the global limit.`)
				}
				onClick={() => {
					setError(null);
					setDraft(override === null ? "" : String(override));
					setEditing(true);
				}}
			>
				{override !== null && (
					<span
						aria-hidden="true"
						className={cn(
							"size-1.5 rounded-full",
							atLimit ? "bg-destructive" : "bg-foreground/70",
						)}
					/>
				)}
				<span>
					{usedToday}
					<span className={cn(!atLimit && "text-muted-foreground")}>
						/{limit > 0 ? limit : "∞"}
					</span>
				</span>
			</button>
		</div>
	);
}

function SettingsTab() {
	const config = useQuery(api.admin.getConfig);
	const save = useMutation(api.admin.saveConfig);
	const fetchModels = useAction(api.openrouter.models);

	const [model, setModel] = useState("");
	const [coachModel, setCoachModel] = useState("");
	// OpenRouter provider pins; empty string means auto routing.
	const [provider, setProvider] = useState("");
	const [coachProvider, setCoachProvider] = useState("");
	const [prepareModel, setPrepareModel] = useState("");
	// Thinking per model slot: "" = model default, "off", or effort level.
	const [reasoning, setReasoning] = useState("");
	const [coachReasoning, setCoachReasoning] = useState("");
	const [prepareReasoning, setPrepareReasoning] = useState("");
	const [temperature, setTemperature] = useState(0.8);
	const [systemPrompt, setSystemPrompt] = useState("");
	// Kept as the raw input string; parsed and validated on save.
	const [dailyMessageLimit, setDailyMessageLimit] = useState("30");
	const [loaded, setLoaded] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [models, setModels] = useState<ModelInfo[] | undefined>(undefined);
	const [modelsFailed, setModelsFailed] = useState(false);

	// Seed the form once from the server; after that the form owns the state.
	useEffect(() => {
		if (!config || loaded) return;
		setModel(config.model);
		setCoachModel(config.coachModel);
		setProvider(config.provider);
		setCoachProvider(config.coachProvider);
		setPrepareModel(config.prepareModel);
		setReasoning(config.reasoning);
		setCoachReasoning(config.coachReasoning);
		setPrepareReasoning(config.prepareReasoning);
		setTemperature(config.temperature);
		setSystemPrompt(config.systemPrompt);
		setDailyMessageLimit(String(config.dailyMessageLimit));
		setLoaded(true);
	}, [config, loaded]);

	// The catalog is one-shot data, not a subscription; load it once.
	useEffect(() => {
		let active = true;
		fetchModels({})
			.then((list) => {
				if (active) setModels(list);
			})
			.catch(() => {
				if (active) setModelsFailed(true);
			});
		return () => {
			active = false;
		};
	}, [fetchModels]);

	if (!config || !loaded) {
		return <p className="mt-6 text-muted-foreground text-sm">Loading…</p>;
	}

	const selectedModel = models?.find((m) => m.id === model.trim());
	const selectedCoachModel = coachModel.trim()
		? models?.find((m) => m.id === coachModel.trim())
		: undefined;

	// Catalog check. Only enforced when the catalog loaded; if it didn't,
	// any typed id is still allowed as the escape hatch.
	const isUnknownModel = (id: string) =>
		models !== undefined &&
		id.trim() !== "" &&
		!models.some((m) => m.id === id.trim());

	const parsedLimit = Number(dailyMessageLimit);
	const limitInvalid =
		dailyMessageLimit.trim() === "" ||
		!Number.isInteger(parsedLimit) ||
		parsedLimit < 0;

	const invalid =
		limitInvalid ||
		isUnknownModel(model) ||
		isUnknownModel(coachModel) ||
		isUnknownModel(prepareModel);

	// Unsaved edits drive the floating save bar.
	const dirty =
		model !== config.model ||
		coachModel !== config.coachModel ||
		provider !== config.provider ||
		coachProvider !== config.coachProvider ||
		prepareModel !== config.prepareModel ||
		reasoning !== config.reasoning ||
		coachReasoning !== config.coachReasoning ||
		prepareReasoning !== config.prepareReasoning ||
		temperature !== config.temperature ||
		systemPrompt !== config.systemPrompt ||
		dailyMessageLimit !== String(config.dailyMessageLimit);

	const discard = () => {
		setModel(config.model);
		setCoachModel(config.coachModel);
		setProvider(config.provider);
		setCoachProvider(config.coachProvider);
		setPrepareModel(config.prepareModel);
		setReasoning(config.reasoning);
		setCoachReasoning(config.coachReasoning);
		setPrepareReasoning(config.prepareReasoning);
		setTemperature(config.temperature);
		setSystemPrompt(config.systemPrompt);
		setDailyMessageLimit(String(config.dailyMessageLimit));
		setError(null);
	};

	const submit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (invalid) return;
		setError(null);
		setSaving(true);
		try {
			await save({
				model,
				coachModel,
				provider,
				coachProvider,
				prepareModel,
				reasoning,
				coachReasoning,
				prepareReasoning,
				temperature,
				systemPrompt,
				dailyMessageLimit: parsedLimit,
			});
			setSaved(true);
			window.setTimeout(() => setSaved(false), 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save");
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<div
				className={cn(
					"mt-6 flex items-center gap-2 rounded-xl px-4 py-3 text-sm",
					config.hasOpenRouterKey
						? "bg-[#DCFCE7] text-[#166534]"
						: "bg-amber-100 text-amber-900",
				)}
			>
				<span
					className={cn(
						"size-2 rounded-full",
						config.hasOpenRouterKey ? "bg-[#16A34A]" : "bg-amber-500",
					)}
					aria-hidden="true"
				/>
				{config.hasOpenRouterKey
					? "OpenRouter key is configured. Replies are AI-generated."
					: "No OpenRouter key. Replies fall back to scripted lines. Set one with: npx convex env set OPENROUTER_API_KEY sk-or-…"}
			</div>

			<form onSubmit={submit} className="mt-8">
				<section aria-label="Models">
					<h2 className="font-semibold text-lg tracking-tight">Models</h2>
					<div className="mt-4 space-y-7">
						<div>
							<div className="flex items-baseline gap-2">
								<Label htmlFor="model">Persona model</Label>
								<span className="text-muted-foreground text-xs">
									chats with users
								</span>
							</div>
							<ModelField
								id="model"
								value={model}
								onChange={(value) => {
									setModel(value);
									// Providers are model-specific; a new model means auto.
									setProvider("");
								}}
								models={models}
								placeholder="vendor/model-id"
							/>
							<ThinkingPicker
								value={reasoning}
								onChange={setReasoning}
								model={selectedModel}
							/>
							{modelsFailed && (
								<p className="mt-2 text-muted-foreground text-xs">
									Catalog unavailable; any model id still works.
								</p>
							)}
							{isUnknownModel(model) && <UnknownModelWarning />}
							{selectedModel && (
								<ModelDetailCard
									key={selectedModel.id}
									model={selectedModel}
									provider={provider}
									onProviderChange={setProvider}
								/>
							)}
						</div>

						<div>
							<div className="flex items-baseline gap-2">
								<Label htmlFor="coachModel">Coach model</Label>
								<span className="text-muted-foreground text-xs">
									marks, rewrites, reports
								</span>
							</div>
							<ModelField
								id="coachModel"
								value={coachModel}
								onChange={(value) => {
									setCoachModel(value);
									setCoachProvider("");
								}}
								models={models}
								placeholder="Same as the persona model"
							/>
							{coachModel.trim() !== "" && (
								<ThinkingPicker
									value={coachReasoning}
									onChange={setCoachReasoning}
									model={selectedCoachModel}
								/>
							)}
							{isUnknownModel(coachModel) && <UnknownModelWarning />}
							{selectedCoachModel && (
								<ModelDetailCard
									key={selectedCoachModel.id}
									model={selectedCoachModel}
									provider={coachProvider}
									onProviderChange={setCoachProvider}
								/>
							)}
						</div>

						<div>
							<div className="flex items-baseline gap-2">
								<Label htmlFor="prepareModel">Prepare model</Label>
								<span className="text-muted-foreground text-xs">
									scenario setup questions
								</span>
							</div>
							<ModelField
								id="prepareModel"
								value={prepareModel}
								onChange={setPrepareModel}
								models={models}
								placeholder="Same as the coach model"
							/>
							{prepareModel.trim() !== "" && (
								<ThinkingPicker
									value={prepareReasoning}
									onChange={setPrepareReasoning}
									model={models?.find((m) => m.id === prepareModel.trim())}
								/>
							)}
							{isUnknownModel(prepareModel) && <UnknownModelWarning />}
						</div>
					</div>
				</section>

				<section
					aria-label="Generation"
					className="mt-10 border-border/60 border-t pt-8"
				>
					<h2 className="font-semibold text-lg tracking-tight">Generation</h2>
					<div className="mt-4">
						<div className="flex items-baseline justify-between">
							<Label htmlFor="temperature">Temperature</Label>
							<span className="text-muted-foreground text-sm tabular-nums">
								{temperature.toFixed(1)}
							</span>
						</div>
						<Slider
							id="temperature"
							value={[temperature]}
							onValueChange={(value) => {
								const next = Array.isArray(value) ? value[0] : value;
								setTemperature(typeof next === "number" ? next : 0.8);
							}}
							min={0}
							max={2}
							step={0.1}
							className="mt-3"
						/>
					</div>
					<div className="mt-6">
						<Label htmlFor="systemPrompt">Extra persona instructions</Label>
						<Textarea
							id="systemPrompt"
							value={systemPrompt}
							onChange={(e) => setSystemPrompt(e.target.value)}
							rows={4}
							placeholder="Optional; added to every persona prompt"
							className="mt-2"
						/>
					</div>
				</section>

				<section
					aria-label="Limits"
					className="mt-10 border-border/60 border-t pt-8"
				>
					<h2 className="font-semibold text-lg tracking-tight">Limits</h2>
					<div className="mt-4">
						<Label htmlFor="dailyMessageLimit">Daily message limit</Label>
						<Input
							id="dailyMessageLimit"
							type="number"
							min={0}
							step={1}
							inputMode="numeric"
							value={dailyMessageLimit}
							onChange={(e) => setDailyMessageLimit(e.target.value)}
							className="mt-2 w-28"
						/>
						<p className="mt-2 text-muted-foreground text-xs">
							Messages each user can send per day, across all conversations.
							Hitting it also blocks new sessions and prepare. Resets at
							midnight UTC. 0 means unlimited.
						</p>
					</div>
				</section>

				{(dirty || saved) && (
					<div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex justify-center px-4">
						<output
							className={cn(
								"pointer-events-auto flex items-center rounded-full bg-foreground text-background shadow-black/20 shadow-lg",
								"fade-in slide-in-from-bottom-4 zoom-in-95 animate-in duration-300 ease-out motion-reduce:animate-none",
								saved && !dirty
									? "gap-1.5 px-4 py-2.5"
									: "gap-3 py-1.5 pr-1.5 pl-4",
							)}
						>
							{saved && !dirty ? (
								<>
									<Check className="size-4" aria-hidden="true" />
									<span className="text-sm">Saved</span>
								</>
							) : (
								<>
									<span
										className={cn(
											"text-sm",
											error || invalid ? "text-red-300" : "text-background/80",
										)}
									>
										{error ??
											(limitInvalid
												? "Daily limit must be a whole number, 0 or more"
												: invalid
													? "Fix the unknown model id first"
													: "Unsaved changes")}
									</span>
									<span className="flex items-center gap-1">
										<Button
											type="submit"
											size="sm"
											disabled={saving || invalid}
											className="rounded-full bg-background text-foreground hover:bg-background/90"
										>
											{saving ? "Saving…" : "Save settings"}
										</Button>
										<button
											type="button"
											onClick={discard}
											disabled={saving}
											aria-label="Discard changes"
											className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-background/15 disabled:opacity-50"
										>
											<X className="size-4" aria-hidden="true" />
										</button>
									</span>
								</>
							)}
						</output>
					</div>
				)}
			</form>
		</>
	);
}

function UnknownModelWarning() {
	return (
		<p className="mt-2 text-amber-700 text-xs">
			This id isn't in the OpenRouter catalog. Pick a suggestion or fix it;
			saving is blocked until it matches a real model.
		</p>
	);
}

function PromptsSection() {
	const prompts = useQuery(api.admin.getPrompts);

	return (
		<section aria-label="Prompts" className="mt-6">
			<p className="text-muted-foreground text-sm">
				Placeholders like {"{{topic}}"} fill in per conversation. Keep the JSON
				format lines intact.
			</p>
			<div className="mt-5 space-y-4">
				{prompts === undefined ? (
					<p className="text-muted-foreground text-sm">Loading…</p>
				) : (
					prompts.map((prompt) => (
						<PromptEditor key={prompt.key} prompt={prompt} />
					))
				)}
			</div>
		</section>
	);
}

function PromptEditor({
	prompt,
}: {
	prompt: {
		key: string;
		label: string;
		description: string;
		variables: string[];
		template: string;
		defaultTemplate: string;
		customized: boolean;
	};
}) {
	const savePrompt = useMutation(api.admin.savePrompt);
	const resetPrompt = useMutation(api.admin.resetPrompt);
	const [draft, setDraft] = useState(prompt.template);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const dirty = draft.trim() !== prompt.template.trim();
	const isDefault = draft.trim() === prompt.defaultTemplate.trim();

	const save = async () => {
		setError(null);
		try {
			await savePrompt({ key: prompt.key, template: draft });
			setSaved(true);
			window.setTimeout(() => setSaved(false), 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save");
		}
	};

	const reset = async () => {
		setError(null);
		try {
			await resetPrompt({ key: prompt.key });
			setDraft(prompt.defaultTemplate);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not reset");
		}
	};

	return (
		<div className="rounded-2xl bg-muted/40 p-4">
			<div className="flex items-baseline gap-2">
				<h3 className="font-medium text-sm">{prompt.label}</h3>
				{prompt.customized && (
					<span className="rounded-full bg-[#FFD94A]/50 px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide">
						Customized
					</span>
				)}
			</div>
			<p className="mt-1 text-muted-foreground text-xs">{prompt.description}</p>
			{prompt.variables.length > 0 && (
				<p className="mt-2 flex flex-wrap gap-1.5">
					{prompt.variables.map((name) => (
						<code
							key={name}
							className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
						>
							{`{{${name}}}`}
						</code>
					))}
				</p>
			)}
			<Textarea
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				rows={Math.min(12, Math.max(4, draft.split("\n").length + 1))}
				aria-label={`${prompt.label} prompt`}
				className="mt-3 bg-background text-sm leading-relaxed focus-visible:bg-background"
			/>
			<div className="mt-2.5 flex items-center gap-3">
				<Button size="sm" disabled={!dirty} onClick={() => void save()}>
					Save prompt
				</Button>
				{!isDefault && (
					<Button
						size="sm"
						variant="ghost"
						className="text-muted-foreground"
						onClick={() => void reset()}
					>
						Reset to default
					</Button>
				)}
				{saved && (
					<span className="fade-in flex animate-in items-center gap-1 text-[#166534] text-sm duration-200 motion-reduce:animate-none">
						<Check className="size-4" aria-hidden="true" />
						Saved
					</span>
				)}
				{error && <span className="text-destructive text-sm">{error}</span>}
			</div>
		</div>
	);
}

/** Live credit balance for the deployment's OpenRouter key. */
function CreditsSection() {
	const fetchCredits = useAction(api.openrouter.credits);
	const [credits, setCredits] = useState<CreditsInfo | null | undefined>(
		undefined,
	);
	const [failed, setFailed] = useState(false);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		setBusy(true);
		setFailed(false);
		try {
			setCredits(await fetchCredits({}));
		} catch {
			setFailed(true);
		} finally {
			setBusy(false);
		}
	}, [fetchCredits]);

	useEffect(() => {
		void load();
	}, [load]);

	const remaining =
		credits?.totalCredits != null && credits.totalUsage != null
			? credits.totalCredits - credits.totalUsage
			: null;
	const usedShare =
		credits?.totalCredits != null &&
		credits.totalUsage != null &&
		credits.totalCredits > 0
			? Math.min(1, credits.totalUsage / credits.totalCredits)
			: null;

	return (
		<section className="mt-3 rounded-xl bg-muted/40 p-4">
			<div className="flex items-center justify-between">
				<h2 className="font-medium text-sm">OpenRouter credits</h2>
				<button
					type="button"
					onClick={() => void load()}
					disabled={busy}
					aria-label="Refresh credits"
					className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
				>
					<RefreshCw
						className={cn("size-3.5", busy && "animate-spin")}
						aria-hidden="true"
					/>
				</button>
			</div>

			{failed ? (
				<p className="mt-2 text-muted-foreground text-sm">
					Couldn't reach OpenRouter. Try refreshing.
				</p>
			) : credits === undefined ? (
				<p className="mt-2 text-muted-foreground text-sm">Loading…</p>
			) : credits === null ? null : (
				<>
					<p className="mt-2 font-bold text-2xl tabular-nums tracking-tight">
						{remaining !== null ? formatUsd(remaining) : "Unknown"}{" "}
						<span className="font-normal text-muted-foreground text-sm">
							remaining
						</span>
					</p>
					{credits.totalCredits != null && credits.totalUsage != null && (
						<p className="mt-0.5 text-muted-foreground text-sm">
							{formatUsd(credits.totalUsage)} used of{" "}
							{formatUsd(credits.totalCredits)} purchased
							{credits.isFreeTier ? ", free tier" : ""}
						</p>
					)}
					{usedShare !== null && (
						<div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
							<div
								className="h-full rounded-full bg-foreground/70"
								style={{ width: `${usedShare * 100}%` }}
							/>
						</div>
					)}
					{credits.keyLimit != null && (
						<p className="mt-2 text-muted-foreground text-xs">
							This key is capped at {formatUsd(credits.keyLimit)}
							{credits.keyLimitRemaining != null
								? `, ${formatUsd(credits.keyLimitRemaining)} left under the cap`
								: ""}
							.
						</p>
					)}
				</>
			)}

			<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
				<ExternalTextLink href="https://openrouter.ai/settings/credits">
					Manage credits
				</ExternalTextLink>
				<ExternalTextLink href="https://openrouter.ai/activity">
					Activity
				</ExternalTextLink>
				<ExternalTextLink href="https://openrouter.ai/settings/keys">
					API keys
				</ExternalTextLink>
			</div>
		</section>
	);
}

/** Free-text model id input with catalog suggestions while typing. */
function ModelField({
	id,
	value,
	onChange,
	models,
	placeholder,
}: {
	id: string;
	value: string;
	onChange: (value: string) => void;
	models: ModelInfo[] | undefined;
	placeholder: string;
}) {
	const [focused, setFocused] = useState(false);

	const query = value.trim().toLowerCase();
	const matches = useMemo(() => {
		if (!models) return [];
		const pool = query
			? models.filter(
					(m) =>
						m.id.toLowerCase().includes(query) ||
						m.name.toLowerCase().includes(query),
				)
			: models;
		return pool.slice(0, 8);
	}, [models, query]);

	// Nothing left to suggest once the field holds the only match.
	const exactOnly = matches.length === 1 && matches[0].id === value.trim();
	const open = focused && matches.length > 0 && !exactOnly;

	return (
		<div className="relative">
			<Input
				id={id}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				placeholder={placeholder}
				autoComplete="off"
				className="mt-2"
			/>
			{open && (
				<div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border bg-popover shadow-lg">
					{matches.map((m) => (
						<button
							key={m.id}
							type="button"
							// onMouseDown so the pick lands before the input's blur.
							onMouseDown={(e) => {
								e.preventDefault();
								onChange(m.id);
								setFocused(false);
							}}
							className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/60"
						>
							<span className="min-w-0">
								<span className="block truncate text-sm">{m.name}</span>
								<span className="block truncate text-muted-foreground text-xs">
									{m.id}
								</span>
							</span>
							<span className="whitespace-nowrap text-muted-foreground text-xs tabular-nums">
								{priceLabel(m.promptPrice)} in · {priceLabel(m.completionPrice)}{" "}
								out
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}

/**
 * Compact, collapsible detail for the picked catalog model. Collapsed it
 * shows one summary line; expanding reveals limits, modalities, the
 * provider picker, and supported parameters. Warnings always show.
 */
function ModelDetailCard({
	model,
	maxTokens,
	provider,
	onProviderChange,
}: {
	model: ModelInfo;
	maxTokens?: number;
	/** Pinned OpenRouter provider name; empty string means auto routing. */
	provider: string;
	onProviderChange: (provider: string) => void;
}) {
	const fetchEndpoints = useAction(api.openrouter.modelEndpoints);
	const [providers, setProviders] = useState<ProviderEndpoint[] | undefined>(
		undefined,
	);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		let active = true;
		setProviders(undefined);
		fetchEndpoints({ modelId: model.id })
			.then((list) => {
				if (active) setProviders(list);
			})
			.catch(() => {
				if (active) setProviders([]);
			});
		return () => {
			active = false;
		};
	}, [fetchEndpoints, model.id]);

	const warnings: string[] = [];
	if (
		model.supportedParameters.length > 0 &&
		!model.supportedParameters.includes("temperature")
	) {
		warnings.push("This model ignores the temperature setting.");
	}
	if (
		maxTokens !== undefined &&
		model.maxCompletionTokens !== null &&
		maxTokens > model.maxCompletionTokens
	) {
		warnings.push(
			`Max tokens is above this model's output cap of ${formatTokenCount(model.maxCompletionTokens)}.`,
		);
	}

	const summary = [
		`${priceLabel(model.promptPrice)} in`,
		`${priceLabel(model.completionPrice)} out`,
		`${formatTokenCount(model.contextLength)} ctx`,
		...(provider !== "" ? [provider] : []),
	].join(" · ");

	return (
		<div className="mt-3 rounded-xl bg-muted/40">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
			>
				<span className="min-w-0">
					<span className="block truncate font-medium text-sm">
						{model.name}
					</span>
					<span className="block truncate text-muted-foreground text-xs tabular-nums">
						{summary}
					</span>
				</span>
				<ChevronDown
					className={cn(
						"size-4 shrink-0 text-muted-foreground transition-transform",
						open && "rotate-180",
					)}
					aria-hidden="true"
				/>
			</button>

			{warnings.length > 0 && (
				<div className={cn("px-4", !open && "pb-3")}>
					{warnings.map((warning) => (
						<p key={warning} className="text-amber-700 text-xs">
							{warning}
						</p>
					))}
				</div>
			)}

			<div
				inert={!open}
				className={cn(
					"grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
					open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
				)}
			>
				<div className="min-h-0 overflow-hidden">
					<div className="px-4 pb-4">
						<div className="flex items-baseline justify-between gap-3">
							<p className="truncate text-muted-foreground text-xs">
								{model.id}
							</p>
							<span className="text-xs">
								<ExternalTextLink href={`https://openrouter.ai/${model.id}`}>
									OpenRouter
								</ExternalTextLink>
							</span>
						</div>

						<dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
							<ModelFact label="Input" value={priceLabel(model.promptPrice)} />
							<ModelFact
								label="Output"
								value={priceLabel(model.completionPrice)}
							/>
							<ModelFact
								label="Context"
								value={formatTokenCount(model.contextLength)}
							/>
							<ModelFact
								label="Max output"
								value={formatTokenCount(model.maxCompletionTokens)}
							/>
						</dl>

						{(model.inputModalities.length > 0 || model.isModerated) && (
							<div className="mt-3 flex flex-wrap gap-1.5">
								{model.inputModalities.map((modality) => (
									<span
										key={modality}
										className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
									>
										{modality}
									</span>
								))}
								{model.isModerated && (
									<span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
										moderated
									</span>
								)}
							</div>
						)}

						<ProviderPicker
							providers={providers}
							provider={provider}
							onProviderChange={onProviderChange}
						/>

						{model.supportedParameters.length > 0 && (
							<div className="mt-4">
								<h4 className="text-muted-foreground text-xs">
									Supported parameters
								</h4>
								<div className="mt-1 flex flex-wrap gap-1.5">
									{model.supportedParameters.map((parameter) => (
										<span
											key={parameter}
											className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs"
										>
											{parameter}
										</span>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * Picks which provider serves the model. Auto (OpenRouter routing) is the
 * default; pinning routes every request to that one provider, no fallbacks.
 */
function ProviderPicker({
	providers,
	provider,
	onProviderChange,
}: {
	providers: ProviderEndpoint[] | undefined;
	provider: string;
	onProviderChange: (provider: string) => void;
}) {
	// One row per provider name; endpoints can repeat a name per quantization.
	const options = useMemo(() => {
		const byName = new Map<string, ProviderEndpoint>();
		for (const endpoint of providers ?? []) {
			if (!byName.has(endpoint.providerName)) {
				byName.set(endpoint.providerName, endpoint);
			}
		}
		return [...byName.values()];
	}, [providers]);

	const pinnedUnlisted =
		provider !== "" &&
		providers !== undefined &&
		!options.some((o) => o.providerName === provider);

	return (
		<div className="mt-4">
			<h4 className="text-muted-foreground text-xs">Provider</h4>
			{providers === undefined ? (
				<p className="mt-1 text-muted-foreground text-sm">Loading…</p>
			) : (
				<div className="mt-1.5 space-y-0.5">
					<ProviderOption
						name="Auto"
						note="recommended"
						detail="OpenRouter picks the best route"
						selected={provider === ""}
						onSelect={() => onProviderChange("")}
					/>
					{options.map((option) => (
						<ProviderOption
							key={option.providerName}
							name={option.providerName}
							note={option.quantization ?? undefined}
							detail={[
								`${priceLabel(option.promptPrice)} in`,
								`${priceLabel(option.completionPrice)} out`,
								`${formatTokenCount(option.contextLength)} ctx`,
								...(option.uptime !== null
									? [`${option.uptime.toFixed(1)}% up`]
									: []),
							].join(" · ")}
							selected={provider === option.providerName}
							onSelect={() => onProviderChange(option.providerName)}
						/>
					))}
					{pinnedUnlisted && (
						<ProviderOption
							name={provider}
							detail="not currently listed for this model"
							selected
							onSelect={() => onProviderChange("")}
						/>
					)}
				</div>
			)}
			{provider !== "" && (
				<p className="mt-1.5 text-muted-foreground text-xs">
					Every request goes only to {provider}; if it's down, replies fall back
					to scripted lines. Pick Auto to let OpenRouter reroute.
				</p>
			)}
		</div>
	);
}

function ProviderOption({
	name,
	note,
	detail,
	selected,
	onSelect,
}: {
	name: string;
	note?: string;
	detail: string;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={selected}
			className={cn(
				"-mx-2 flex w-[calc(100%+1rem)] items-baseline justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors",
				selected ? "bg-muted" : "hover:bg-muted/60",
			)}
		>
			<span className="flex min-w-0 items-center gap-2">
				<span
					className={cn(
						"size-1.5 shrink-0 rounded-full",
						selected ? "bg-foreground" : "bg-muted-foreground/30",
					)}
					aria-hidden="true"
				/>
				<span className="truncate text-sm">{name}</span>
				{note && (
					<span className="shrink-0 text-muted-foreground text-xs">{note}</span>
				)}
			</span>
			<span className="whitespace-nowrap text-muted-foreground text-xs tabular-nums">
				{detail}
			</span>
		</button>
	);
}

function ModelFact({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-muted-foreground text-xs">{label}</dt>
			<dd className="mt-0.5 font-medium text-sm tabular-nums">{value}</dd>
		</div>
	);
}

type TemplateRow = Doc<"scenarioTemplates">;

function TemplatesSection() {
	const templates = useQuery(api.templates.listForAdmin);
	const seedDefaults = useMutation(api.templates.seedDefaults);
	const [seeding, setSeeding] = useState(false);
	const [seedError, setSeedError] = useState<string | null>(null);
	/** Platform whose "add template" editor is open, if any. */
	const [addingTo, setAddingTo] = useState<Platform | null>(null);

	if (templates === undefined) {
		return <p className="mt-6 text-muted-foreground text-sm">Loading…</p>;
	}

	const empty = templates.length === 0;

	const seed = async () => {
		setSeeding(true);
		setSeedError(null);
		try {
			await seedDefaults({});
		} catch (err) {
			setSeedError(err instanceof Error ? err.message : "Could not load");
		} finally {
			setSeeding(false);
		}
	};

	return (
		<section aria-label="Scenario templates" className="mt-6">
			<p className="text-muted-foreground text-sm">
				Ready-made scenarios learners can pick on the prepare page instead of
				answering the setup questions. Empty persona fields fall back to the
				platform's default persona.
			</p>
			{empty && (
				<div className="mt-5 rounded-2xl bg-muted/40 p-4">
					<p className="text-sm">
						Learners currently see the built-in starter set. Load it here to
						edit, reorder, or hide individual templates.
					</p>
					<div className="mt-3 flex items-center gap-3">
						<Button size="sm" disabled={seeding} onClick={() => void seed()}>
							{seeding ? "Loading…" : "Load starter set"}
						</Button>
						{seedError && (
							<span className="text-destructive text-sm">{seedError}</span>
						)}
					</div>
				</div>
			)}
			<div className="mt-6 space-y-8">
				{useCases.map((useCase) => {
					// Custom rooms are always self-described; no templates there.
					if (useCase.platform === "custom") return null;
					const rows = templates.filter((t) => t.platform === useCase.platform);
					return (
						<div key={useCase.platform}>
							<div className="flex items-center gap-2.5">
								<PlatformTile platform={useCase.platform} size="sm" />
								<h3 className="flex-1 font-medium text-sm">{useCase.label}</h3>
								<Button
									size="sm"
									variant="ghost"
									className="text-muted-foreground"
									disabled={addingTo === useCase.platform}
									onClick={() => setAddingTo(useCase.platform)}
								>
									<Plus />
									Add
								</Button>
							</div>
							<div className="mt-2 space-y-2">
								{rows.length === 0 &&
									!empty &&
									addingTo !== useCase.platform && (
										<p className="px-1 text-muted-foreground text-xs">
											No templates; learners go straight to the setup questions.
										</p>
									)}
								<TemplateList rows={rows} />
								{addingTo === useCase.platform && (
									<TemplateEditor
										platform={useCase.platform}
										onClose={() => setAddingTo(null)}
									/>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

/**
 * Templates for one platform, reorderable by dragging the grip handle. While a
 * drag is in flight the order is kept locally so the row follows the cursor;
 * the mutation lands on drop and the local copy is dropped with it.
 */
function TemplateList({ rows }: { rows: TemplateRow[] }) {
	const reorder = useMutation(api.templates.reorder);
	const [dragId, setDragId] = useState<TemplateRow["_id"] | null>(null);
	const [localIds, setLocalIds] = useState<TemplateRow["_id"][] | null>(null);

	const byId = new Map(rows.map((row) => [row._id, row]));
	const ordered =
		localIds
			?.map((id) => byId.get(id))
			.filter((row): row is TemplateRow => Boolean(row)) ?? rows;

	const startDrag = (id: TemplateRow["_id"]) => {
		setDragId(id);
		setLocalIds(ordered.map((row) => row._id));
	};

	/** Slots the dragged row into `index` as the cursor passes each card. */
	const dragOver = (index: number) => {
		if (!dragId) return;
		setLocalIds((ids) => {
			if (!ids) return ids;
			const from = ids.indexOf(dragId);
			if (from === -1 || from === index) return ids;
			const next = [...ids];
			next.splice(index, 0, ...next.splice(from, 1));
			return next;
		});
	};

	const endDrag = () => {
		const id = dragId;
		const toIndex = localIds?.indexOf(id as TemplateRow["_id"]) ?? -1;
		setDragId(null);
		setLocalIds(null);
		if (id && toIndex !== -1) void reorder({ id, toIndex });
	};

	/** Keyboard equivalent of a drag, so reordering isn't mouse-only. */
	const nudge = (index: number, delta: number) => {
		const row = ordered[index];
		const toIndex = index + delta;
		if (!row || toIndex < 0 || toIndex >= ordered.length) return;
		void reorder({ id: row._id, toIndex });
	};

	return (
		<ul className="space-y-2">
			{ordered.map((row, index) => (
				<TemplateCard
					key={row._id}
					template={row}
					isDragging={dragId === row._id}
					onDragStart={() => startDrag(row._id)}
					onDragOver={() => dragOver(index)}
					onDragEnd={endDrag}
					onNudge={(delta) => nudge(index, delta)}
				/>
			))}
		</ul>
	);
}

function TemplateCard({
	template,
	isDragging,
	onDragStart,
	onDragOver,
	onDragEnd,
	onNudge,
}: {
	template: TemplateRow;
	isDragging: boolean;
	onDragStart: () => void;
	onDragOver: () => void;
	onDragEnd: () => void;
	onNudge: (delta: number) => void;
}) {
	const setEnabled = useMutation(api.templates.setEnabled);
	const [open, setOpen] = useState(false);
	// Only a grab on the handle arms the drag; the rest of the card stays a
	// normal click target for expanding and text selection.
	const [armed, setArmed] = useState(false);

	return (
		<li
			draggable={armed}
			onDragStart={onDragStart}
			onDragEnd={() => {
				setArmed(false);
				onDragEnd();
			}}
			onDragOver={(event) => {
				event.preventDefault();
				onDragOver();
			}}
			className={cn(
				"rounded-2xl bg-muted/40 transition-opacity",
				!template.enabled && "opacity-60",
				isDragging && "opacity-40",
			)}
		>
			<div className="flex items-center gap-1 py-1 pr-3 pl-1">
				<button
					type="button"
					aria-label={`Reorder ${template.title}`}
					onPointerDown={() => setArmed(true)}
					onPointerUp={() => setArmed(false)}
					onKeyDown={(event) => {
						if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
						event.preventDefault();
						onNudge(event.key === "ArrowUp" ? -1 : 1);
					}}
					className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:text-foreground active:cursor-grabbing"
				>
					<GripVertical className="size-4" aria-hidden="true" />
				</button>
				<button
					type="button"
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left"
				>
					<span className="min-w-0 flex-1">
						<span className="block truncate font-medium text-sm">
							{template.title}
						</span>
						<span className="block truncate text-muted-foreground text-xs">
							{template.description || template.topic}
						</span>
					</span>
					<ChevronDown
						className={cn(
							"size-4 shrink-0 text-muted-foreground transition-transform",
							open && "rotate-180",
						)}
						aria-hidden="true"
					/>
				</button>
				<Switch
					checked={template.enabled}
					onCheckedChange={(checked) =>
						void setEnabled({ id: template._id, enabled: checked })
					}
					aria-label={`Show ${template.title} to learners`}
					className="ml-2"
				/>
			</div>
			{open && (
				<TemplateEditor
					template={template}
					platform={template.platform}
					onClose={() => setOpen(false)}
				/>
			)}
		</li>
	);
}

/** Edits an existing template, or creates one when `template` is absent. */
function TemplateEditor({
	template,
	platform,
	onClose,
}: {
	template?: TemplateRow;
	platform: Platform;
	onClose: () => void;
}) {
	const save = useMutation(api.templates.save);
	const removeTemplate = useMutation(api.templates.remove);
	const ids = useId();
	const [title, setTitle] = useState(template?.title ?? "");
	const [description, setDescription] = useState(template?.description ?? "");
	const [topic, setTopic] = useState(template?.topic ?? "");
	const [personaName, setPersonaName] = useState(template?.personaName ?? "");
	const [personaRole, setPersonaRole] = useState(template?.personaRole ?? "");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	const submit = async () => {
		setBusy(true);
		setError(null);
		try {
			await save({
				id: template?._id,
				platform,
				title,
				description,
				topic,
				personaName,
				personaRole,
			});
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Could not save");
			setBusy(false);
		}
	};

	return (
		<div
			className={cn(
				"space-y-3 px-4 pb-4",
				template
					? "border-border/60 border-t pt-3"
					: "rounded-2xl bg-muted/40 pt-4",
			)}
		>
			<div className="grid gap-3 sm:grid-cols-2">
				<div>
					<Label htmlFor={`${ids}-title`}>Title</Label>
					<Input
						id={`${ids}-title`}
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="Follow up after a job interview"
						className="mt-1.5 bg-background"
					/>
				</div>
				<div>
					<Label htmlFor={`${ids}-description`}>Hint</Label>
					<Input
						id={`${ids}-description`}
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="One line shown under the title"
						className="mt-1.5 bg-background"
					/>
				</div>
			</div>
			<div>
				<Label htmlFor={`${ids}-topic`}>Scenario</Label>
				<Textarea
					id={`${ids}-topic`}
					value={topic}
					onChange={(e) => setTopic(e.target.value)}
					rows={3}
					placeholder="From the learner's point of view: what's the situation, and what do they want?"
					className="mt-1.5 bg-background text-sm leading-relaxed focus-visible:bg-background"
				/>
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<div>
					<Label htmlFor={`${ids}-personaName`}>Partner name</Label>
					<Input
						id={`${ids}-personaName`}
						value={personaName}
						onChange={(e) => setPersonaName(e.target.value)}
						placeholder="Sarah Lin"
						className="mt-1.5 bg-background"
					/>
				</div>
				<div>
					<Label htmlFor={`${ids}-personaRole`}>Partner role</Label>
					<Input
						id={`${ids}-personaRole`}
						value={personaRole}
						onChange={(e) => setPersonaRole(e.target.value)}
						placeholder="Hiring manager at the company"
						className="mt-1.5 bg-background"
					/>
				</div>
			</div>
			<div className="flex items-center gap-3 pt-1">
				<Button size="sm" disabled={busy} onClick={() => void submit()}>
					{busy ? "Saving…" : template ? "Save" : "Add template"}
				</Button>
				<Button
					size="sm"
					variant="ghost"
					className="text-muted-foreground"
					onClick={onClose}
				>
					Cancel
				</Button>
				{error && <span className="text-destructive text-sm">{error}</span>}
				{template &&
					(confirmDelete ? (
						<Button
							size="sm"
							variant="destructive"
							className="ml-auto"
							onClick={() => void removeTemplate({ id: template._id })}
						>
							Really delete?
						</Button>
					) : (
						<Button
							size="sm"
							variant="ghost"
							className="ml-auto text-muted-foreground"
							onClick={() => setConfirmDelete(true)}
						>
							<Trash2 />
							Delete
						</Button>
					))}
			</div>
		</div>
	);
}
