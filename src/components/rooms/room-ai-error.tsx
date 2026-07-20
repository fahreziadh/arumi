import { useMutation } from "convex/react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export function RoomAiError({
	conversationId,
	error,
	className,
}: {
	conversationId: string;
	error: string | null | undefined;
	className?: string;
}) {
	const retry = useMutation(api.conversations.retryReply);
	if (!error) return null;

	return (
		<div
			role="alert"
			className={cn(
				"fade-in slide-in-from-bottom-1 mx-auto w-full max-w-2xl animate-in px-4 duration-200 motion-reduce:animate-none sm:px-6",
				className,
			)}
		>
			<div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 px-4 py-3 text-destructive text-sm">
				<CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
				<div className="min-w-0 flex-1">
					<p className="font-medium">The persona couldn't reply.</p>
					<p className="mt-0.5 break-words text-destructive/80 text-xs">
						{error}
					</p>
				</div>
				<Button
					size="sm"
					variant="secondary"
					className="shrink-0"
					onClick={() =>
						void retry({
							conversationId: conversationId as Id<"conversations">,
						})
					}
				>
					Try again
				</Button>
			</div>
		</div>
	);
}

export function CoachFailedNote({
	messageId,
	error,
}: {
	messageId: string;
	error?: string | null;
}) {
	const retry = useMutation(api.conversations.retryAnalysis);
	if (!error) return null;
	return (
		<button
			type="button"
			title={error}
			onClick={() => void retry({ messageId: messageId as Id<"messages"> })}
			className="ml-1.5 inline-flex cursor-pointer items-center gap-1 align-baseline text-[10px] text-destructive/70 transition-colors hover:text-destructive"
		>
			<RefreshCw className="size-3" aria-hidden="true" />
			coach failed, retry
		</button>
	);
}
