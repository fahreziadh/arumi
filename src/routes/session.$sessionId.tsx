import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { RequireAuth } from "@/components/auth-gate";
import { NotFoundState } from "@/components/not-found-state";
import { ChatRoom } from "@/components/rooms/chat-room";
import { EmailRoom } from "@/components/rooms/email-room";
import { IssueRoom } from "@/components/rooms/issue-room";
import { roomKind } from "@/lib/use-cases";

export const Route = createFileRoute("/session/$sessionId")({
	component: SessionPage,
});

function SessionPage() {
	return (
		<RequireAuth>
			<SessionRoom />
		</RequireAuth>
	);
}

function SessionRoom() {
	const { sessionId } = Route.useParams();
	const conversation = useQuery(api.conversations.get, {
		conversationId: sessionId,
	});
	const send = useMutation(api.conversations.send).withOptimisticUpdate(
		(localStore, args) => {
			const current = localStore.getQuery(api.conversations.get, {
				conversationId: sessionId,
			});
			if (!current) return;
			localStore.setQuery(
				api.conversations.get,
				{ conversationId: sessionId },
				{
					...current,
					typing: true,
					messages: [
						...current.messages,
						{
							id: `optimistic-${current.messages.length}` as Id<"messages">,
							author: "user",
							text: args.text,
							at: Date.now(),
							tips: undefined,
							rewrite: undefined,
							tipsError: null,
							streaming: false,
						},
					],
				},
			);
		},
	);

	if (conversation === undefined) return <div className="h-dvh" />;
	if (conversation === null) {
		return (
			<NotFoundState
				title="We couldn't find that conversation."
				description="It may have been deleted."
			/>
		);
	}

	const onSend = (text: string) => {
		void send({ conversationId: conversation.id, text });
	};

	const kind = roomKind(conversation.platform);
	if (kind === "email") {
		return (
			<EmailRoom
				conversation={conversation}
				typing={conversation.typing}
				onSend={onSend}
			/>
		);
	}
	if (kind === "issue") {
		return (
			<IssueRoom
				conversation={conversation}
				typing={conversation.typing}
				onSend={onSend}
			/>
		);
	}
	return (
		<ChatRoom
			conversation={conversation}
			typing={conversation.typing}
			onSend={onSend}
		/>
	);
}
