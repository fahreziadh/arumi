import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotFoundState } from "@/components/not-found-state";
import { ChatRoom } from "@/components/rooms/chat-room";
import { CoachCard } from "@/components/rooms/coach-card";
import { EmailRoom } from "@/components/rooms/email-room";
import { IssueRoom } from "@/components/rooms/issue-room";
import { type CoachTip, highlightReply, reviewSubmission } from "@/lib/coach";
import { typingDelay } from "@/lib/persona";
import { useSettings } from "@/lib/settings";
import { addPersonaReply, sendMessage, useAppState } from "@/lib/store";
import { roomKind } from "@/lib/use-cases";

export const Route = createFileRoute("/session/$sessionId")({
	component: SessionPage,
});

function SessionPage() {
	const { sessionId } = Route.useParams();
	const app = useAppState();
	const conversation = app.conversations[sessionId];
	const settings = useSettings();

	const [typing, setTyping] = useState(false);
	const [tip, setTip] = useState<CoachTip | null>(null);
	const timerRef = useRef<number | null>(null);
	const dismissTip = useCallback(() => setTip(null), []);

	// Chat rooms surface tips inline (hover a sparkle-marked message);
	// only email/issue rooms still use the floating card.
	const kind = conversation ? roomKind(conversation.platform) : null;
	const inlineTips = kind === "chat";

	const scheduleReply = useCallback(
		(userText: string) => {
			setTyping(true);
			timerRef.current = window.setTimeout(() => {
				timerRef.current = null;
				addPersonaReply(sessionId);
				setTyping(false);
			}, typingDelay(userText));
		},
		[sessionId],
	);

	// If the page was reloaded mid-turn (last message is the user's), pick the
	// reply back up. On unmount, deliver a pending reply instantly.
	// biome-ignore lint/correctness/useExhaustiveDependencies: run once per session
	useEffect(() => {
		const last = conversation?.messages[conversation.messages.length - 1];
		if (last?.author === "user") scheduleReply(last.text);
		return () => {
			if (timerRef.current !== null) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
				addPersonaReply(sessionId);
			}
		};
	}, [sessionId]);

	// Surface a phrase highlight when a new persona reply lands. Seeded with the
	// current last reply so nothing fires for messages already on screen.
	const lastPersona = [...(conversation?.messages ?? [])]
		.reverse()
		.find((m) => m.author === "persona");
	const seenReplyRef = useRef(lastPersona?.id);
	useEffect(() => {
		if (!lastPersona || seenReplyRef.current === lastPersona.id) return;
		seenReplyRef.current = lastPersona.id;
		if (inlineTips || !settings.aiHighlights) return;
		const t = highlightReply(lastPersona.text);
		if (t) setTip(t);
	}, [lastPersona, settings.aiHighlights, inlineTips]);

	if (!conversation) {
		return (
			<NotFoundState
				title="We couldn't find that conversation."
				description="It may have been deleted on this device."
			/>
		);
	}

	const send = (text: string) => {
		sendMessage(sessionId, text);
		scheduleReply(text);
		if (!inlineTips && settings.submissionHighlights) {
			const t = reviewSubmission(text);
			if (t) setTip(t);
		}
	};

	const room =
		kind === "email" ? (
			<EmailRoom conversation={conversation} typing={typing} onSend={send} />
		) : kind === "issue" ? (
			<IssueRoom conversation={conversation} typing={typing} onSend={send} />
		) : (
			<ChatRoom conversation={conversation} typing={typing} onSend={send} />
		);

	return (
		<>
			{room}
			{!inlineTips && <CoachCard tip={tip} onDismiss={dismissTip} />}
		</>
	);
}
