import {
	ArrowUp,
	MousePointer2,
	MoveRight,
	Reply,
	Send,
	SendHorizontal,
} from "lucide-react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { KIND_DOT, KIND_LABEL } from "@/components/coach/tip-card";
import { PersonaAvatar, UserAvatar } from "@/components/persona-avatar";
import { PlatformTile } from "@/components/platform-tile";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import type { CoachKind } from "@/lib/coach";
import { type PlatformTheme, platformTheme } from "@/lib/platform-theme";
import type { Persona, Platform } from "@/lib/types";
import { roomKind } from "@/lib/use-cases";
import { cn } from "@/lib/utils";

interface DemoMark {
	quote: string;
	kind: CoachKind;
	detail: string;
	correction?: string;
	featured?: boolean;
}

interface DemoScene {
	platform: Platform;
	title: string;
	subtitle: string;
	persona: Persona;
	/** Email only: the subject the thread hangs under. */
	subject?: string;
	sent: string;
	incoming: string;
	draft: string;
	marks: DemoMark[];
}

const scenes: DemoScene[] = [
	{
		platform: "email",
		title: "Daniel Okafor",
		subtitle: "Engineering Manager · Email Threads",
		persona: { name: "Daniel Okafor", role: "Engineering Manager" },
		subject: "Q3 handover",
		sent: "Thanks for the heads up.",
		incoming: "Could you send over the handover doc before Friday?",
		draft: "Dear Daniel, I am kindly requesting you to wait until Thursday.",
		marks: [
			{
				quote: "Dear Daniel,",
				kind: "fix",
				correction: "Hi Daniel,",
				detail:
					"“Dear” belongs in formal letters. A work thread opens with “Hi”.",
			},
			{
				quote: "I am kindly requesting you to wait",
				kind: "tone",
				detail:
					"This lands stiff on a teammate. “Could it wait until Thursday?” is warmer and just as polite.",
				featured: true,
			},
		],
	},
	{
		platform: "slack",
		title: "#design-review",
		subtitle: "Maya Chen · Product Designer",
		persona: { name: "Maya Chen", role: "Product Designer" },
		sent: "Morning! The new build is on staging.",
		incoming: "Can you review the onboarding flow today?",
		draft: "Sure! I will send you my feedbacks by 5.",
		marks: [
			{
				quote: "my feedbacks",
				kind: "fix",
				correction: "my feedback",
				detail: "“Feedback” is uncountable, so it never takes an -s.",
				featured: true,
			},
			{
				quote: "by 5",
				kind: "gem",
				detail: "A concrete time. Maya never has to ask again.",
			},
		],
	},
	{
		platform: "whatsapp",
		title: "Alex Rivera",
		subtitle: "online",
		persona: { name: "Alex Rivera", role: "Friend" },
		sent: "hey! sorry, was in a meeting all morning",
		incoming: "we're grabbing dinner at 8, you in?",
		draft: "I am in! So exciting to see you all.",
		marks: [
			{
				quote: "I am in!",
				kind: "gem",
				detail: "Short and warm. This is how friends actually answer.",
			},
			{
				quote: "So exciting",
				kind: "fix",
				correction: "So excited",
				detail: "Dinner is exciting; you are the one who feels excited.",
				featured: true,
			},
		],
	},
	{
		platform: "support",
		title: "Acme Support",
		subtitle: "Nadia · replies in a minute",
		persona: { name: "Nadia Haddad", role: "Support agent" },
		sent: "Hi, I need help with an order.",
		incoming: "What happens when you try to check out?",
		draft: "The payment page doesn't loading since yesterday.",
		marks: [
			{
				quote: "doesn't loading",
				kind: "fix",
				correction: "doesn't load",
				detail: "After “doesn't”, the verb stays in its base form.",
				featured: true,
			},
			{
				quote: "since yesterday",
				kind: "tip",
				detail: "Saying when it started saves the agent a round trip.",
			},
		],
	},
];

const phases = [
	"arriving",
	"incoming",
	"composing",
	"reading",
	"marking",
	"tip",
	"leaving",
] as const;

type Phase = (typeof phases)[number];

const phaseMs: Record<Phase, number> = {
	arriving: 750,
	incoming: 650,
	composing: 0,
	reading: 1300,
	marking: 700,
	tip: 2000,
	leaving: 300,
};

const typeMs = 32;

const markColor: Record<CoachKind, string> = {
	fix: "rgb(248 113 113 / 0.85)",
	tip: "rgb(251 191 36 / 0.95)",
	tone: "rgb(167 139 250 / 0.85)",
	gem: "#FFD94A",
};

const tipWidth = 288;

function reached(phase: Phase, target: Phase) {
	return phases.indexOf(phase) >= phases.indexOf(target);
}

function positionedMarks(scene: DemoScene) {
	return scene.marks
		.map((mark) => ({ ...mark, start: scene.draft.indexOf(mark.quote) }))
		.filter((mark) => mark.start >= 0)
		.sort((a, b) => a.start - b.start);
}

function featuredMark(marks: ReturnType<typeof positionedMarks>) {
	return marks.find((mark) => mark.featured) ?? marks[0];
}

export function CoachShowcase() {
	const reducedMotion = usePrefersReducedMotion();
	const [sceneIndex, setSceneIndex] = useState(0);
	const [phase, setPhase] = useState<Phase>("arriving");
	const [typed, setTyped] = useState(0);
	const scene = scenes[sceneIndex];

	useEffect(() => {
		if (phase !== "composing") return;
		if (typed >= scene.draft.length) {
			setPhase("reading");
			return;
		}
		const next = reducedMotion ? scene.draft.length : typed + 1;
		const timer = setTimeout(() => setTyped(next), typeMs);
		return () => clearTimeout(timer);
	}, [phase, typed, scene.draft, reducedMotion]);

	useEffect(() => {
		if (phase === "composing") return;
		const timer = setTimeout(() => {
			if (phase === "leaving") {
				setSceneIndex((i) => (i + 1) % scenes.length);
				setTyped(0);
				setPhase("arriving");
				return;
			}
			setPhase(phases[phases.indexOf(phase) + 1]);
		}, phaseMs[phase]);
		return () => clearTimeout(timer);
	}, [phase]);

	const cardRef = useRef<HTMLDivElement>(null);
	const markRef = useRef<HTMLSpanElement>(null);
	const hover = useCoachHover({
		cardRef,
		markRef,
		hovering: reached(phase, "marking"),
		sceneIndex,
	});

	const theme = platformTheme[scene.platform];
	const marks = positionedMarks(scene);
	const leaving = phase === "leaving";
	const email = roomKind(scene.platform) === "email";

	const draftBody =
		typed === 0 ? (
			<span className="text-muted-foreground">
				{email
					? `Reply to ${scene.persona.name}…`
					: `Message ${scene.persona.name.split(" ")[0]}…`}
			</span>
		) : (
			<span className={cn(phase === "reading" && "coach-scan")}>
				<MarkedDraft
					text={scene.draft.slice(0, typed)}
					marks={marks}
					lit={reached(phase, "marking")}
					featuredRef={markRef}
				/>
				{phase === "composing" && <span className="demo-caret" />}
			</span>
		);

	return (
		<div
			ref={cardRef}
			aria-hidden="true"
			className="relative flex h-[22rem] w-full max-w-md flex-col overflow-hidden rounded-3xl border bg-background text-left shadow-[0_24px_60px_-32px_rgb(0_0_0/0.45)] sm:h-[24rem]"
		>
			<div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
				<div
					className={cn(
						"flex min-w-0 items-center gap-3 transition-opacity duration-200 ease-out",
						leaving && "opacity-0",
					)}
				>
					<PlatformTile platform={scene.platform} />
					<span className="min-w-0">
						<span className="block truncate font-medium text-sm leading-tight">
							{scene.title}
						</span>
						<span className="block truncate text-muted-foreground text-xs">
							{scene.subtitle}
						</span>
					</span>
				</div>
				<span className="ml-auto flex gap-1">
					{scenes.map((s, i) => (
						<span
							key={s.platform}
							className={cn(
								"h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
								i === sceneIndex ? "w-4 bg-foreground/50" : "w-1.5 bg-border",
							)}
						/>
					))}
				</span>
			</div>

			<div
				className={cn(
					"min-h-0 flex-1 px-4 py-4 transition-[opacity,filter] duration-200 ease-out",
					theme.wall,
					leaving && "opacity-0 blur-[2px]",
				)}
			>
				{email ? (
					<EmailThread scene={scene} arrived={reached(phase, "incoming")} />
				) : (
					<ChatThread
						scene={scene}
						theme={theme}
						arrived={reached(phase, "incoming")}
					/>
				)}
			</div>

			<div
				className={cn(
					"relative shrink-0 px-4 py-3.5",
					email ? "bg-muted/40" : theme.composerBar,
				)}
			>
				<FeaturedTip
					mark={featuredMark(marks)}
					anchorX={hover.anchorX}
					visible={reached(phase, "tip") && !leaving}
				/>
				<div
					className={cn(
						"transition-[opacity,filter] duration-200 ease-out",
						leaving && "opacity-0 blur-[2px]",
					)}
				>
					{email ? (
						<EmailComposer scene={scene} draftBody={draftBody} />
					) : (
						<ChatComposer
							theme={theme}
							draftBody={draftBody}
							empty={typed === 0}
						/>
					)}
				</div>
			</div>

			{hover.point && <DemoPointer point={hover.point} hidden={leaving} />}
		</div>
	);
}

function ChatThread({
	scene,
	theme,
	arrived,
}: {
	scene: DemoScene;
	theme: PlatformTheme;
	arrived: boolean;
}) {
	return (
		<div className="flex h-full flex-col justify-end gap-2">
			<p
				className={cn(
					"max-w-[80%] self-end rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
					theme.bubbleOut,
				)}
			>
				{scene.sent}
			</p>
			<div className="flex items-end gap-2">
				<PersonaAvatar
					persona={scene.persona}
					platform={scene.platform}
					size="sm"
				/>
				{arrived ? (
					<p
						className={cn(
							"bubble-in max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
							theme.bubbleIn,
						)}
					>
						{scene.incoming}
					</p>
				) : (
					<span
						className={cn(
							"flex items-center gap-1 rounded-2xl px-3.5 py-3.5",
							theme.bubbleIn,
						)}
					>
						<span className="typing-dot size-1.5 rounded-full bg-current opacity-40" />
						<span className="typing-dot size-1.5 rounded-full bg-current opacity-40" />
						<span className="typing-dot size-1.5 rounded-full bg-current opacity-40" />
					</span>
				)}
			</div>
		</div>
	);
}

function EmailThread({
	scene,
	arrived,
}: {
	scene: DemoScene;
	arrived: boolean;
}) {
	return (
		<div className="flex h-full flex-col gap-3">
			<p className="font-semibold text-base leading-snug tracking-tight">
				{scene.subject}
			</p>
			<div className="flex gap-2.5 border-border/60 border-t pt-3">
				<PersonaAvatar
					persona={scene.persona}
					platform={scene.platform}
					size="sm"
				/>
				<div className="min-w-0">
					<p className="text-xs">
						<span className="font-medium">{scene.persona.name}</span>
						<span className="text-muted-foreground"> · 9:41 AM</span>
					</p>
					{arrived ? (
						<p className="bubble-in mt-1 text-sm leading-relaxed">
							{scene.incoming}
						</p>
					) : (
						<span className="mt-2 flex flex-col gap-2">
							<span className="block h-3 w-52 animate-pulse rounded-full bg-muted" />
							<span className="block h-3 w-32 animate-pulse rounded-full bg-muted" />
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function ChatComposer({
	theme,
	draftBody,
	empty,
}: {
	theme: PlatformTheme;
	draftBody: ReactNode;
	empty: boolean;
}) {
	return (
		<div className="flex items-end gap-2">
			<div
				className={cn(
					"min-h-11 flex-1 rounded-3xl border px-4 py-2.5 text-sm leading-relaxed",
					theme.composerInput,
				)}
			>
				{draftBody}
			</div>
			<span
				className={cn(
					"flex size-11 shrink-0 items-center justify-center rounded-full transition-opacity duration-200 ease-out",
					theme.sendButton ?? "bg-primary text-primary-foreground",
					empty && "opacity-40",
				)}
			>
				{theme.sendIcon === "plane" ? (
					<SendHorizontal className="size-4" />
				) : (
					<ArrowUp className="size-4" />
				)}
			</span>
		</div>
	);
}

function EmailComposer({
	scene,
	draftBody,
}: {
	scene: DemoScene;
	draftBody: ReactNode;
}) {
	return (
		<div className="rounded-2xl bg-background p-3 shadow-lg ring-1 ring-foreground/5">
			<div className="flex items-center gap-2.5">
				<UserAvatar size="sm" />
				<p className="flex items-center gap-1.5 text-muted-foreground text-sm">
					<Reply className="size-3.5" />
					Reply to {scene.persona.name.split(" ")[0]}
				</p>
			</div>
			<div className="mt-2 min-h-14 px-1 text-sm leading-relaxed">
				{draftBody}
			</div>
			<div className="mt-2 flex items-center gap-3">
				<span className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground text-sm">
					<Send className="size-3.5" />
					Send
				</span>
				<span className="text-muted-foreground text-xs">⌘↵ to send</span>
			</div>
		</div>
	);
}

/**
 * A real pointer never travels in a straight line: give each axis its own
 * curve, duration, and head start, and the path bows the way a hand does.
 */
function DemoPointer({
	point,
	hidden,
}: {
	point: { x: number; y: number };
	hidden: boolean;
}) {
	return (
		<span
			style={{ transform: `translateX(${point.x}px)` }}
			className="pointer-events-none absolute top-0 left-0 z-20 transition-transform duration-[620ms] ease-[cubic-bezier(0.25,1,0.35,1)] motion-reduce:transition-none"
		>
			<span
				style={{ transform: `translateY(${point.y}px)` }}
				className="block transition-transform delay-[70ms] duration-[540ms] ease-[cubic-bezier(0.65,0,0.2,1)] motion-reduce:transition-none motion-reduce:delay-0"
			>
				<MousePointer2
					className={cn(
						"size-6 fill-background stroke-[1.5] text-foreground drop-shadow-md transition-opacity duration-200 ease-out",
						hidden && "opacity-0",
					)}
				/>
			</span>
		</span>
	);
}

function between(min: number, max: number) {
	return min + Math.random() * (max - min);
}

/**
 * Where the pointer waits out each room, as a fraction of the card. A hand
 * leaves the mouse to the right of what it is reading, never over the thread.
 */
const restingSpots = [
	{ x: [0.74, 0.9], y: [0.58, 0.7] },
	{ x: [0.7, 0.88], y: [0.34, 0.46] },
	{ x: [0.76, 0.92], y: [0.62, 0.76] },
	{ x: [0.68, 0.86], y: [0.44, 0.56] },
] as const;

/**
 * Rests the pointer beside the room, then puts it on the featured mark so the
 * coach card opens under a hover instead of appearing out of nowhere.
 */
function useCoachHover({
	cardRef,
	markRef,
	hovering,
	sceneIndex,
}: {
	cardRef: RefObject<HTMLDivElement | null>;
	markRef: RefObject<HTMLSpanElement | null>;
	hovering: boolean;
	sceneIndex: number;
}) {
	const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
	const [anchorX, setAnchorX] = useState(16);

	useEffect(() => {
		const card = cardRef.current;
		if (!card) return;
		const cardRect = card.getBoundingClientRect();
		const mark = hovering ? markRef.current : null;

		if (!mark) {
			const spot = restingSpots[sceneIndex % restingSpots.length];
			setPoint({
				x: between(spot.x[0], spot.x[1]) * cardRect.width,
				y: between(spot.y[0], spot.y[1]) * cardRect.height,
			});
			return;
		}

		const markRect = mark.getClientRects()[0] ?? mark.getBoundingClientRect();
		const markX = markRect.left - cardRect.left;
		setPoint({
			x: markX + markRect.width * between(0.25, 0.55),
			y: markRect.top - cardRect.top + markRect.height * between(0.4, 0.6),
		});
		setAnchorX(
			Math.min(
				Math.max(markX - 24, 16),
				Math.max(cardRect.width - tipWidth - 16, 16),
			),
		);
	}, [hovering, sceneIndex, cardRef, markRef]);

	return { point, anchorX };
}

function MarkedDraft({
	text,
	marks,
	lit,
	featuredRef,
}: {
	text: string;
	marks: ReturnType<typeof positionedMarks>;
	lit: boolean;
	featuredRef: RefObject<HTMLSpanElement | null>;
}) {
	const nodes = [];
	let cursor = 0;
	for (const [i, mark] of marks.entries()) {
		const end = mark.start + mark.quote.length;
		if (end > text.length) break;
		if (mark.start > cursor) nodes.push(text.slice(cursor, mark.start));
		nodes.push(
			<span
				key={mark.quote}
				ref={mark === featuredMark(marks) ? featuredRef : undefined}
				data-lit={lit}
				className="demo-mark"
				style={
					{
						transitionDelay: `${i * 140}ms`,
						"--demo-mark-color": markColor[mark.kind],
					} as CSSProperties
				}
			>
				{mark.quote}
			</span>,
		);
		cursor = end;
	}
	nodes.push(text.slice(cursor));
	return <>{nodes}</>;
}

function FeaturedTip({
	mark,
	anchorX,
	visible,
}: {
	mark: DemoMark;
	anchorX: number;
	visible: boolean;
}) {
	return (
		<div
			style={{ left: anchorX, width: tipWidth }}
			className={cn(
				"absolute bottom-full z-10 mb-1 max-w-[calc(100%-2rem)] origin-bottom rounded-xl border bg-popover p-3 shadow-lg transition-[opacity,transform] duration-200 ease-out",
				visible
					? "scale-100 opacity-100"
					: "scale-[0.97] opacity-0 motion-reduce:scale-100",
			)}
		>
			<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
				<span className={cn("size-1.5 rounded-full", KIND_DOT[mark.kind])} />
				{KIND_LABEL[mark.kind]}
			</p>
			{mark.correction ? (
				<p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm">
					<s className="text-muted-foreground decoration-red-400/70">
						{mark.quote}
					</s>
					<MoveRight className="size-3.5 shrink-0 text-muted-foreground/60" />
					<span className="font-medium text-green-700">{mark.correction}</span>
				</p>
			) : (
				<p className="mt-1.5 font-medium text-sm">“{mark.quote}”</p>
			)}
			<p className="mt-1 text-pretty text-muted-foreground text-sm leading-relaxed">
				{mark.detail}
			</p>
		</div>
	);
}
