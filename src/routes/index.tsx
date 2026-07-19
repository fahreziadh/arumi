import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { PlatformTile } from "@/components/platform-tile";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteConversation, useAppState } from "@/lib/store";
import { useCases } from "@/lib/use-cases";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const app = useAppState();
	const conversations = Object.values(app.conversations).sort(
		(a, b) => b.createdAt - a.createdAt,
	);

	return (
		<div className="min-h-dvh">
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-2 focus:ring-ring"
			>
				Skip to content
			</a>
			<AppHeader />
			<main id="main" className="mx-auto max-w-2xl px-4 pt-10 pb-16 sm:px-6">
				<section aria-label="Start a conversation">
					<h1 className="text-balance font-bold text-3xl tracking-tight sm:text-4xl">
						Practice English{" "}
						<span className="-mx-1 rounded-sm bg-[#FFE55A]/70 px-1 [box-decoration-break:clone]">
							where you write it
						</span>
					</h1>
					<p className="mt-3 max-w-md text-pretty text-muted-foreground">
						Low-stakes reps in the real formats: email a project manager, reply
						to a maintainer, keep up in a busy chat.
					</p>
					<div className="mt-8 grid gap-2.5 sm:grid-cols-2">
						{useCases.map((u) => (
							<Link
								key={u.platform}
								to="/prepare/$useCase"
								params={{ useCase: u.platform }}
								className="group flex items-center gap-3.5 rounded-2xl bg-muted/50 px-4 py-3.5 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
							>
								<PlatformTile
									platform={u.platform}
									size="lg"
									morph
									className="transition-transform group-hover:scale-105"
								/>
								<span className="min-w-0">
									<span className="block font-medium text-sm">{u.label}</span>
									<span className="block truncate text-muted-foreground text-xs">
										{u.hint}
									</span>
								</span>
							</Link>
						))}
					</div>
				</section>

				{conversations.length > 0 && (
					<section aria-label="Conversations" className="mt-12">
						<h2 className="mb-3 font-medium text-muted-foreground text-sm">
							Pick up where you left off
						</h2>
						<ul className="space-y-1">
							{conversations.map((c) => (
								<li
									key={c.id}
									className="flex items-center rounded-2xl transition-colors focus-within:bg-muted/50 hover:bg-muted/50"
								>
									<Link
										to="/session/$sessionId"
										params={{ sessionId: c.id }}
										className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
									>
										<PlatformTile platform={c.platform} size="lg" />
										<span className="min-w-0 flex-1">
											<span className="block truncate font-medium text-sm">
												{c.topic}
											</span>
											<span className="block truncate text-muted-foreground text-xs">
												{c.platformLabel} ·{" "}
												{formatDistanceToNow(c.createdAt, { addSuffix: true })}
											</span>
										</span>
									</Link>
									<DeleteConversationButton id={c.id} topic={c.topic} />
								</li>
							))}
						</ul>
					</section>
				)}
			</main>
		</div>
	);
}

function DeleteConversationButton({
	id,
	topic,
}: {
	id: string;
	topic: string;
}) {
	const [open, setOpen] = useState(false);
	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Delete conversation about ${topic}`}
						className="mr-2 hover:text-destructive focus-visible:text-destructive"
					/>
				}
			>
				<Trash2 />
			</AlertDialogTrigger>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete This Conversation?</AlertDialogTitle>
					<AlertDialogDescription>
						“{topic}” will be removed from this device. You can’t undo this.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={() => {
							setOpen(false);
							deleteConversation(id);
						}}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
