import { CircleDot } from "lucide-react";
import { useState } from "react";
import { PersonaAvatar, UserAvatar } from "@/components/persona-avatar";
import { formatDateTime } from "@/lib/intl";
import type { Conversation } from "@/lib/types";
import { TextareaComposer } from "./composer";
import { RoomHeader } from "./room-header";
import { useAutoScroll } from "./use-auto-scroll";

export function IssueRoom({
	conversation,
	typing,
	onSend,
}: {
	conversation: Conversation;
	typing: boolean;
	onSend: (text: string) => void;
}) {
	const [draft, setDraft] = useState("");
	const scrollRef = useAutoScroll<HTMLElement>(conversation.messages.length);

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
									<p className="whitespace-pre-wrap break-words px-3 py-3 text-sm leading-relaxed">
										{m.text}
									</p>
								</article>
							);
						})}
					</div>
				</div>
			</main>

			<div className="shrink-0 bg-background">
				<TextareaComposer
					value={draft}
					onValueChange={setDraft}
					onSubmit={() => {
						onSend(draft.trim());
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
