import { CircleDot } from "lucide-react";
import { useState } from "react";
import { CoachMarkedText } from "@/components/coach/marks";
import { MarkdownText } from "@/components/markdown-text";
import { PersonaAvatar, UserAvatar } from "@/components/persona-avatar";
import { rewriteForMessage, tipsForMessage } from "@/lib/coach";
import { formatDateTime } from "@/lib/intl";
import { useSettings } from "@/lib/settings";
import type { Conversation } from "@/lib/types";
import { type SendOptions, TextareaComposer } from "./composer";
import { CoachFailedNote, RoomAiError } from "./room-ai-error";
import { RoomHeader } from "./room-header";
import { useAutoScroll } from "./use-auto-scroll";

function IssueSkeleton() {
	return (
		<div className="overflow-hidden rounded-lg border" aria-hidden="true">
			<div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2">
				<div className="size-5 shrink-0 animate-pulse rounded-full bg-muted-foreground/20" />
				<div className="h-3 w-24 animate-pulse rounded-full bg-muted-foreground/20" />
			</div>
			<div className="space-y-2.5 px-3 py-3.5">
				<div className="h-3 w-full animate-pulse rounded-full bg-muted" />
				<div className="h-3 w-[70%] animate-pulse rounded-full bg-muted" />
			</div>
		</div>
	);
}

export function IssueRoom({
	conversation,
	typing,
	onSend,
}: {
	conversation: Conversation;
	typing: boolean;
	onSend: (text: string, options: SendOptions) => void;
}) {
	const [draft, setDraft] = useState("");
	const lastMessage = conversation.messages[conversation.messages.length - 1];
	const scrollRef = useAutoScroll<HTMLElement>(
		`${conversation.messages.length}:${lastMessage?.text.length ?? 0}`,
	);
	const settings = useSettings();

	return (
		<div className="flex h-dvh flex-col">
			<RoomHeader
				title={conversation.platformLabel}
				subtitle={
					typing
						? `${conversation.persona.name} is commenting…`
						: `${conversation.persona.name} · ${conversation.persona.role}`
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
					<h1 className="text-pretty font-semibold text-lg leading-snug">
						{conversation.topic}
					</h1>
					<p className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
						<span className="flex items-center gap-1 rounded-full bg-[#1A7F37] px-2.5 py-1 font-medium text-white">
							<CircleDot className="size-3.5" aria-hidden="true" />
							Open
						</span>
						you opened this issue · {conversation.messages.length}{" "}
						{conversation.messages.length === 1 ? "comment" : "comments"}
					</p>

					<div className="mt-5 space-y-4" role="log" aria-label="Comments">
						{conversation.messages.map((m) => {
							const isUser = m.author === "user";
							const coachOn = isUser
								? settings.submissionHighlights
								: settings.aiHighlights;
							const tips = coachOn ? tipsForMessage(m) : [];
							const rewrite = rewriteForMessage(m);
							const analyzing =
								coachOn && !m.streaming && m.tips === undefined && !m.tipsError;
							return (
								<article
									key={m.id}
									className="overflow-hidden rounded-lg border"
								>
									<div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2">
										{isUser ? (
											<UserAvatar size="xs" />
										) : (
											<PersonaAvatar
												persona={conversation.persona}
												platform={conversation.platform}
												size="xs"
											/>
										)}
										<p className="font-medium text-xs">
											{isUser ? "you" : conversation.persona.name}
										</p>
										<p className="ml-auto text-muted-foreground text-xs tabular-nums">
											{formatDateTime(m.at)}
										</p>
									</div>
									{isUser ? (
										<p className="whitespace-pre-wrap break-words px-3 py-3 text-sm leading-relaxed">
											<CoachMarkedText
												text={m.text}
												tips={tips}
												rewrite={rewrite}
												analyzing={analyzing}
											/>
											<CoachFailedNote messageId={m.id} error={m.tipsError} />
										</p>
									) : (
										<div className="break-words px-3 py-3 text-sm leading-relaxed">
											<MarkdownText text={m.text} />
										</div>
									)}
								</article>
							);
						})}
						{typing && <IssueSkeleton />}
					</div>
				</div>
			</main>

			<div className="shrink-0 bg-background">
				<RoomAiError
					conversationId={conversation.id}
					error={conversation.aiError}
					className="pt-3"
				/>
				<TextareaComposer
					conversationId={conversation.id}
					value={draft}
					onValueChange={setDraft}
					onSubmit={(options) => {
						onSend(draft.trim(), options);
						setDraft("");
					}}
					formLabel="Add a comment"
					inputLabel="Your comment"
					placeholder="Leave a comment…"
					hint="⌘↵ to comment"
					submitChildren="Comment"
					className="vt-composer mx-auto w-full max-w-2xl p-3"
				/>
			</div>
		</div>
	);
}
