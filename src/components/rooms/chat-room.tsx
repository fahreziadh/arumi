import { CheckCheck, Sparkles } from "lucide-react";
import { useRef } from "react";
import { PersonaAvatar, UserAvatar } from "@/components/persona-avatar";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { type CoachTip, highlightReply, reviewSubmission } from "@/lib/coach";
import { formatDate, formatTime } from "@/lib/intl";
import { platformTheme } from "@/lib/platform-theme";
import { useSettings } from "@/lib/settings";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CoachTipBody } from "./coach-card";
import { ChatComposer } from "./composer";
import { RoomHeader } from "./room-header";
import { useAutoScroll } from "./use-auto-scroll";

export function ChatRoom({
	conversation,
	typing,
	onSend,
}: {
	conversation: Conversation;
	typing: boolean;
	onSend: (text: string) => void;
}) {
	// Composite key: the indicator swapping for a reply must still re-pin.
	const scrollRef = useAutoScroll<HTMLElement>(
		`${conversation.messages.length}:${typing}`,
	);
	const settings = useSettings();
	const theme = platformTheme[conversation.platform];
	const flat = theme.chatStyle === "flat";
	// Messages already on screen when the room opens should not replay their
	// entrance animation; only genuinely new ones do.
	const initialIds = useRef(
		new Set(conversation.messages.map((m) => m.id)),
	).current;

	return (
		<div className={cn("flex h-dvh flex-col", theme.wall)}>
			<RoomHeader
				title={conversation.persona.name}
				subtitle={
					typing
						? "typing…"
						: `${conversation.persona.role} · ${conversation.platformLabel}`
				}
				avatar={
					<PersonaAvatar
						persona={conversation.persona}
						platform={conversation.platform}
					/>
				}
				className={theme.header}
				subtitleClassName={theme.headerSub}
			/>

			<main
				ref={scrollRef}
				className="flex-1 overflow-y-auto overscroll-contain"
			>
				<div
					className={cn(
						"mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-4 sm:px-6",
						theme.flatText,
					)}
				>
					<h1 className="sr-only">Chat with {conversation.persona.name}</h1>
					<div role="log" aria-label="Messages" className="mt-auto">
						{!flat && conversation.messages.length > 0 && (
							<div className="flex justify-center">
								<span
									className={cn(
										"rounded-full px-2.5 py-1 font-medium text-xs",
										theme.dateChip ?? "bg-muted text-muted-foreground",
									)}
								>
									{formatDate(conversation.messages[0].at)}
								</span>
							</div>
						)}
						{conversation.messages.map((m, i) => {
							const isUser = m.author === "user";
							const grouped = conversation.messages[i - 1]?.author === m.author;
							const lastInGroup =
								conversation.messages[i + 1]?.author !== m.author;
							const animate = !initialIds.has(m.id);
							// Tips are pure functions of the text, so they live on the
							// message itself: hover a sparkle-marked bubble to read one.
							const tip = isUser
								? settings.submissionHighlights
									? reviewSubmission(m.text)
									: null
								: settings.aiHighlights
									? highlightReply(m.text)
									: null;
							return flat ? (
								<FlatMessage
									key={m.id}
									conversation={conversation}
									isUser={isUser}
									grouped={grouped}
									animate={animate}
									text={m.text}
									at={m.at}
									tip={tip}
								/>
							) : (
								<BubbleMessage
									key={m.id}
									conversation={conversation}
									isUser={isUser}
									grouped={grouped}
									lastInGroup={lastInGroup}
									animate={animate}
									text={m.text}
									at={m.at}
									tip={tip}
								/>
							);
						})}
						{typing &&
							(flat ? (
								<div className="mt-4 flex gap-3" aria-hidden="true">
									<PersonaAvatar
										persona={conversation.persona}
										platform={conversation.platform}
									/>
									<div
										className={cn(
											"flex items-center gap-1 text-muted-foreground",
											theme.flatMeta,
										)}
									>
										<span className="typing-dot size-1.5 rounded-full bg-current" />
										<span className="typing-dot size-1.5 rounded-full bg-current" />
										<span className="typing-dot size-1.5 rounded-full bg-current" />
									</div>
								</div>
							) : (
								<div
									className="bubble-in mt-3 flex justify-start"
									aria-hidden="true"
								>
									<div
										className={cn(
											"flex items-center gap-1 rounded-2xl rounded-bl-md px-4 py-3",
											theme.bubbleIn,
										)}
									>
										<span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
										<span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
										<span className="typing-dot size-1.5 rounded-full bg-muted-foreground" />
									</div>
								</div>
							))}
					</div>
				</div>
			</main>

			<ChatComposer
				personaName={conversation.persona.name}
				theme={theme}
				onSend={onSend}
			/>
		</div>
	);
}

/** Wraps a message in a hover card when the coach has something to say. */
function TipHover({
	tip,
	isUser,
	children,
}: {
	tip: CoachTip | null;
	isUser: boolean;
	children: React.ReactElement;
}) {
	if (!tip) return children;
	return (
		<HoverCard>
			<HoverCardTrigger delay={200} render={children} />
			<HoverCardContent
				side="top"
				align={isUser ? "end" : "start"}
				sideOffset={8}
				className="w-80"
			>
				<CoachTipBody tip={tip} />
			</HoverCardContent>
		</HoverCard>
	);
}

function TipSparkle() {
	return (
		<Sparkles
			className="size-3 shrink-0 text-amber-500"
			aria-label="Coach tip available"
		/>
	);
}

function BubbleTail({
	side,
	placement,
	className,
}: {
	side: "in" | "out";
	placement: "top" | "bottom";
	className?: string;
}) {
	return (
		<svg
			viewBox="0 0 8 12"
			aria-hidden="true"
			className={cn(
				"absolute h-3 w-2 fill-current",
				placement === "top" ? "top-0" : "-scale-y-100 bottom-0",
				side === "out" ? "-right-1.5" : "-left-1.5 -scale-x-100",
				className,
			)}
		>
			<path d="M0 0h8L2 10C1.2 6.5 0.8 3.2 0 0z" />
		</svg>
	);
}

function BubbleMessage({
	conversation,
	isUser,
	grouped,
	lastInGroup,
	animate,
	text,
	at,
	tip,
}: {
	conversation: Conversation;
	isUser: boolean;
	grouped: boolean;
	lastInGroup: boolean;
	animate: boolean;
	text: string;
	at: number;
	tip: CoachTip | null;
}) {
	const theme = platformTheme[conversation.platform];
	const tail = isUser ? theme.tailOut : theme.tailIn;
	const placement = theme.tailPlacement ?? "top";
	const showTail =
		Boolean(tail) && (placement === "top" ? !grouped : lastInGroup);
	return (
		<div
			className={cn(
				"flex",
				animate && "bubble-in",
				isUser ? "justify-end" : "justify-start",
				grouped ? "mt-1" : "mt-3",
			)}
		>
			<TipHover tip={tip} isUser={isUser}>
				<div
					className={cn(
						"relative max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[75%]",
						isUser ? theme.bubbleOut : theme.bubbleIn,
						placement === "top"
							? showTail
								? isUser
									? "rounded-tr-sm"
									: "rounded-tl-sm"
								: isUser
									? "rounded-br-md"
									: "rounded-bl-md"
							: showTail && (isUser ? "rounded-br-sm" : "rounded-bl-sm"),
					)}
				>
					{showTail && (
						<BubbleTail
							side={isUser ? "out" : "in"}
							placement={placement}
							className={tail}
						/>
					)}
					<p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
						{text}
					</p>
					<p
						className={cn(
							"mt-0.5 flex items-center justify-end gap-1 text-right text-[10px] tabular-nums",
							isUser ? theme.bubbleOutMeta : theme.bubbleInMeta,
						)}
					>
						{tip && <TipSparkle />}
						{formatTime(at)}
						{isUser && theme.checks && (
							<CheckCheck
								className={cn("size-3.5", theme.checks)}
								aria-hidden="true"
							/>
						)}
					</p>
				</div>
			</TipHover>
		</div>
	);
}

function FlatMessage({
	conversation,
	isUser,
	grouped,
	animate,
	text,
	at,
	tip,
}: {
	conversation: Conversation;
	isUser: boolean;
	grouped: boolean;
	animate: boolean;
	text: string;
	at: number;
	tip: CoachTip | null;
}) {
	const theme = platformTheme[conversation.platform];
	const name = isUser ? "You" : conversation.persona.name;
	return (
		<div
			className={cn(
				"flex gap-3",
				animate && "bubble-in",
				grouped ? "mt-0.5" : "mt-4",
			)}
		>
			{grouped ? (
				<span className="w-8 shrink-0" />
			) : isUser ? (
				<UserAvatar />
			) : (
				<PersonaAvatar
					persona={conversation.persona}
					platform={conversation.platform}
				/>
			)}
			<div className="min-w-0 flex-1">
				{!grouped && (
					<p className="text-sm leading-tight">
						<span className={cn("font-semibold", theme.flatName)}>{name}</span>{" "}
						<span
							className={cn(
								"ml-1 text-muted-foreground text-xs tabular-nums",
								theme.flatMeta,
							)}
						>
							{formatTime(at)}
						</span>
					</p>
				)}
				{/* Flat rows are all left-aligned, so the card always opens from the start edge. */}
				<TipHover tip={tip} isUser={false}>
					<p
						className={cn(
							"whitespace-pre-wrap break-words text-sm leading-relaxed",
							!grouped && "mt-0.5",
						)}
					>
						{text}
						{tip && (
							<Sparkles
								className="ml-1.5 inline size-3 text-amber-500"
								aria-label="Coach tip available"
							/>
						)}
					</p>
				</TipHover>
			</div>
		</div>
	);
}
