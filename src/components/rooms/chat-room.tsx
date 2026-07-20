import { CheckCheck } from "lucide-react";
import { useRef } from "react";
import { CoachMarkedText } from "@/components/coach/marks";
import { PersonaAvatar, UserAvatar } from "@/components/persona-avatar";
import { type CoachTip, rewriteForMessage, tipsForMessage } from "@/lib/coach";
import { formatDate, formatTime } from "@/lib/intl";
import { platformTheme } from "@/lib/platform-theme";
import { useSettings } from "@/lib/settings";
import type { Conversation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChatComposer, type SendOptions } from "./composer";
import { CoachFailedNote, RoomAiError } from "./room-ai-error";
import { RoomHeader } from "./room-header";
import { useAutoScroll } from "./use-auto-scroll";

export function ChatRoom({
	conversation,
	typing,
	onSend,
}: {
	conversation: Conversation;
	typing: boolean;
	onSend: (text: string, options: SendOptions) => void;
}) {
	// Includes typing so the indicator swapping for a reply still re-pins.
	const lastMessage = conversation.messages[conversation.messages.length - 1];
	const scrollRef = useAutoScroll<HTMLElement>(
		`${conversation.messages.length}:${typing}:${lastMessage?.text.length ?? 0}`,
	);
	const settings = useSettings();
	const theme = platformTheme[conversation.platform];
	const flat = theme.chatStyle === "flat";
	// Only genuinely new messages replay the entrance animation.
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
							const coachOn = isUser
								? settings.submissionHighlights
								: settings.aiHighlights;
							const tips = coachOn ? tipsForMessage(m) : [];
							const rewrite = rewriteForMessage(m);
							const analyzing =
								coachOn && !m.streaming && m.tips === undefined && !m.tipsError;
							return flat ? (
								<FlatMessage
									key={m.id}
									conversation={conversation}
									isUser={isUser}
									grouped={grouped}
									animate={animate}
									messageId={m.id}
									text={m.text}
									at={m.at}
									tips={tips}
									rewrite={rewrite}
									tipsError={m.tipsError}
									analyzing={analyzing}
								/>
							) : (
								<BubbleMessage
									key={m.id}
									conversation={conversation}
									isUser={isUser}
									grouped={grouped}
									lastInGroup={lastInGroup}
									animate={animate}
									messageId={m.id}
									text={m.text}
									at={m.at}
									tips={tips}
									rewrite={rewrite}
									tipsError={m.tipsError}
									analyzing={analyzing}
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

			<RoomAiError
				conversationId={conversation.id}
				error={conversation.aiError}
				className="pb-2"
			/>
			<ChatComposer
				conversationId={conversation.id}
				personaName={conversation.persona.name}
				theme={theme}
				onSend={onSend}
			/>
		</div>
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
	messageId,
	text,
	at,
	tips,
	rewrite,
	tipsError,
	analyzing,
}: {
	conversation: Conversation;
	isUser: boolean;
	grouped: boolean;
	lastInGroup: boolean;
	animate: boolean;
	messageId: string;
	text: string;
	at: number;
	tips: CoachTip[];
	rewrite: string | null;
	tipsError?: string | null;
	analyzing?: boolean;
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
					<CoachMarkedText
						text={text}
						tips={tips}
						rewrite={rewrite}
						analyzing={analyzing}
					/>
					<CoachFailedNote messageId={messageId} error={tipsError} />
				</p>
				<p
					className={cn(
						"mt-0.5 flex items-center justify-end gap-1 text-right text-[10px] tabular-nums",
						isUser ? theme.bubbleOutMeta : theme.bubbleInMeta,
					)}
				>
					{formatTime(at)}
					{isUser && theme.checks && (
						<CheckCheck
							className={cn("size-3.5", theme.checks)}
							aria-hidden="true"
						/>
					)}
				</p>
			</div>
		</div>
	);
}

function FlatMessage({
	conversation,
	isUser,
	grouped,
	animate,
	messageId,
	text,
	at,
	tips,
	rewrite,
	tipsError,
	analyzing,
}: {
	conversation: Conversation;
	isUser: boolean;
	grouped: boolean;
	animate: boolean;
	messageId: string;
	text: string;
	at: number;
	tips: CoachTip[];
	rewrite: string | null;
	tipsError?: string | null;
	analyzing?: boolean;
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
				<p
					className={cn(
						"whitespace-pre-wrap break-words text-sm leading-relaxed",
						!grouped && "mt-0.5",
					)}
				>
					<CoachMarkedText
						text={text}
						tips={tips}
						rewrite={rewrite}
						analyzing={analyzing}
					/>
					<CoachFailedNote messageId={messageId} error={tipsError} />
				</p>
			</div>
		</div>
	);
}
