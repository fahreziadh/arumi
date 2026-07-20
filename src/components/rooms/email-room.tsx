import { Minus, Reply, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { CoachMarkedText } from "@/components/coach/marks";
import { MarkdownText } from "@/components/markdown-text";
import { PersonaAvatar, UserAvatar } from "@/components/persona-avatar";
import { Button } from "@/components/ui/button";
import { rewriteForMessage, tipsForMessage } from "@/lib/coach";
import { formatDateTime } from "@/lib/intl";
import { useSettings } from "@/lib/settings";
import type { Conversation, Message } from "@/lib/types";
import { type SendOptions, TextareaComposer } from "./composer";
import { CoachFailedNote, RoomAiError } from "./room-ai-error";
import { RoomHeader } from "./room-header";
import { useAutoScroll } from "./use-auto-scroll";

export function EmailRoom({
	conversation,
	typing,
	onSend,
}: {
	conversation: Conversation;
	typing: boolean;
	onSend: (text: string, options: SendOptions) => void;
}) {
	const [draft, setDraft] = useState("");
	const [composerOpen, setComposerOpen] = useState(true);
	const lastMessage = conversation.messages[conversation.messages.length - 1];
	const scrollRef = useAutoScroll<HTMLElement>(
		`${conversation.messages.length}:${lastMessage?.text.length ?? 0}`,
	);

	const lastId = conversation.messages[conversation.messages.length - 1]?.id;
	// Your own reply must stay expanded even when the persona's answer lands
	// in the same update, or the coach scan happens inside a collapsed row.
	const lastUserId = [...conversation.messages]
		.reverse()
		.find((m) => m.author === "user")?.id;
	const [openIds, setOpenIds] = useState<Set<string>>(
		() => new Set(lastId ? [lastId] : []),
	);
	// New messages arrive expanded, like Gmail.
	useEffect(() => {
		setOpenIds((prev) => {
			const wanted = [lastId, lastUserId].filter(
				(id): id is string => Boolean(id) && !prev.has(id as string),
			);
			if (wanted.length === 0) return prev;
			const next = new Set(prev);
			for (const id of wanted) next.add(id);
			return next;
		});
	}, [lastId, lastUserId]);

	const toggle = (id: string) => {
		setOpenIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	return (
		<div className="flex h-dvh flex-col">
			<RoomHeader
				title={conversation.persona.name}
				subtitle={
					typing
						? `${conversation.persona.name} is replying…`
						: `${conversation.persona.role} · ${conversation.platformLabel}`
				}
				avatar={
					<PersonaAvatar
						persona={conversation.persona}
						platform={conversation.platform}
					/>
				}
			/>

			<main
				ref={scrollRef}
				className="flex-1 overflow-y-auto overscroll-contain"
			>
				<div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
					<h1 className="text-balance font-semibold text-xl leading-snug tracking-tight">
						{conversation.topic}
					</h1>

					<div
						className="mt-4 divide-y divide-border/60"
						role="log"
						aria-label="Messages"
					>
						{conversation.messages.map((m) => (
							<EmailMessage
								key={m.id}
								message={m}
								conversation={conversation}
								open={openIds.has(m.id)}
								onToggle={() => toggle(m.id)}
							/>
						))}
						{typing && <EmailSkeleton />}
					</div>

					<RoomAiError
						conversationId={conversation.id}
						error={conversation.aiError}
						className="mt-4 px-0 sm:px-0"
					/>

					{composerOpen ? (
						<TextareaComposer
							conversationId={conversation.id}
							value={draft}
							onValueChange={setDraft}
							onSubmit={(options) => {
								onSend(draft.trim(), options);
								setDraft("");
							}}
							formLabel="Reply"
							inputLabel="Your reply"
							placeholder={`Reply to ${conversation.persona.name}…`}
							hint="⌘↵ to send"
							submitChildren={
								<>
									<Send />
									Send
								</>
							}
							className="vt-composer fade-in slide-in-from-bottom-2 mt-6 animate-in rounded-2xl bg-background p-4 shadow-lg ring-1 ring-foreground/5 duration-200 motion-reduce:animate-none"
							textareaClassName="mt-2 min-h-44 bg-transparent px-1 focus-visible:bg-transparent"
							header={
								<div className="flex items-center gap-2.5">
									<UserAvatar size="sm" />
									<p className="flex items-center gap-1.5 text-muted-foreground text-sm">
										<Reply className="size-3.5" aria-hidden="true" />
										Reply to {conversation.persona.name}
									</p>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										aria-label="Collapse reply"
										className="ml-auto"
										onClick={() => setComposerOpen(false)}
									>
										<Minus />
									</Button>
								</div>
							}
							footerEnd={
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="Discard draft"
									className="ml-auto text-muted-foreground"
									onClick={() => {
										setDraft("");
										setComposerOpen(false);
									}}
								>
									<Trash2 />
								</Button>
							}
						/>
					) : (
						<div className="mt-6">
							<Button variant="secondary" onClick={() => setComposerOpen(true)}>
								<Reply />
								Reply
							</Button>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}

function EmailSkeleton() {
	return (
		<div className="py-1" aria-hidden="true">
			<div className="flex w-full items-center gap-3 px-2 py-2.5">
				<div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
				<div className="h-3.5 w-36 animate-pulse rounded-full bg-muted" />
				<div className="ml-auto h-3 w-24 animate-pulse rounded-full bg-muted/70" />
			</div>
			<div className="space-y-2.5 px-2 pt-1 pb-4 pl-[52px]">
				<div className="h-3 w-full animate-pulse rounded-full bg-muted/70" />
				<div className="h-3 w-[92%] animate-pulse rounded-full bg-muted/70" />
				<div className="h-3 w-[65%] animate-pulse rounded-full bg-muted/70" />
			</div>
		</div>
	);
}

function EmailMessage({
	message,
	conversation,
	open,
	onToggle,
}: {
	message: Message;
	conversation: Conversation;
	open: boolean;
	onToggle: () => void;
}) {
	const settings = useSettings();
	const isUser = message.author === "user";
	const name = isUser ? "You" : conversation.persona.name;
	const coachOn = isUser
		? settings.submissionHighlights
		: settings.aiHighlights;
	const tips = coachOn ? tipsForMessage(message) : [];
	const rewrite = rewriteForMessage(message);
	const analyzing =
		coachOn &&
		!message.streaming &&
		message.tips === undefined &&
		!message.tipsError;

	return (
		<article className="py-1">
			<button
				type="button"
				onClick={onToggle}
				aria-expanded={open}
				className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left outline-none transition-colors hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				{isUser ? (
					<UserAvatar />
				) : (
					<PersonaAvatar
						persona={conversation.persona}
						platform={conversation.platform}
					/>
				)}
				<span className="min-w-0 flex-1">
					<span className="flex items-baseline gap-2">
						<span className="truncate font-medium text-sm">{name}</span>
						{open && (
							<span className="truncate text-muted-foreground text-xs">
								to {isUser ? conversation.persona.name : "you"}
							</span>
						)}
					</span>
					{!open && (
						<span className="mt-0.5 block truncate text-muted-foreground text-sm">
							{message.text.replace(/\s+/g, " ")}
						</span>
					)}
				</span>
				<span className="shrink-0 self-start pt-0.5 text-muted-foreground text-xs tabular-nums">
					{formatDateTime(message.at)}
				</span>
			</button>
			{open &&
				(isUser ? (
					<p className="whitespace-pre-wrap break-words px-2 pt-1 pb-4 pl-[52px] text-sm leading-relaxed">
						<CoachMarkedText
							text={message.text}
							tips={tips}
							rewrite={rewrite}
							analyzing={analyzing}
						/>
						<CoachFailedNote messageId={message.id} error={message.tipsError} />
					</p>
				) : (
					<div className="break-words px-2 pt-1 pb-4 pl-[52px] text-sm leading-relaxed">
						<MarkdownText text={message.text} />
					</div>
				))}
		</article>
	);
}
