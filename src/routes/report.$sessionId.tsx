import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { MessageCircle, MoveRight } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { AppHeader } from "@/components/app-header";
import { RequireAuth } from "@/components/auth-gate";
import { KIND_DOT, KIND_LABEL } from "@/components/coach/tip-card";
import { NotFoundState } from "@/components/not-found-state";
import { PlatformTile } from "@/components/platform-tile";
import { Button } from "@/components/ui/button";
import { type CoachTip, summarizeSession } from "@/lib/coach";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/report/$sessionId")({
	component: ReportPage,
});

function ReportPage() {
	return (
		<RequireAuth>
			<Report />
		</RequireAuth>
	);
}

function Report() {
	const { sessionId } = Route.useParams();
	const conversation = useQuery(api.conversations.get, {
		conversationId: sessionId,
	});

	if (conversation === undefined) return <div className="h-dvh" />;
	if (conversation === null) {
		return (
			<NotFoundState
				title="We couldn't find that conversation."
				description="It may have been deleted."
			/>
		);
	}

	const insights = summarizeSession(conversation);

	return (
		<div className="min-h-dvh">
			<AppHeader />
			<main className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-6">
				<div className="flex items-center gap-3.5">
					<PlatformTile platform={conversation.platform} />
					<div className="min-w-0">
						<h1 className="truncate font-bold text-2xl tracking-tight">
							Session report
						</h1>
						<p className="truncate text-muted-foreground text-sm">
							{conversation.persona.name} · {conversation.platformLabel} ·{" "}
							{conversation.topic}
						</p>
					</div>
				</div>

				{insights.score === null ? (
					<div className="mt-10 rounded-2xl bg-muted/50 p-6 text-center">
						<p className="font-medium">Nothing to report yet.</p>
						<p className="mt-1 text-muted-foreground text-sm">
							Send a few messages and come back.
						</p>
					</div>
				) : (
					<>
						<section aria-label="Score" className="mt-8">
							<div className="flex items-end justify-between gap-4">
								<div>
									<p className="font-medium text-muted-foreground text-sm">
										Writing score
									</p>
									<p className="font-bold text-5xl tabular-nums tracking-tight">
										{insights.score}
										<span className="ml-1.5 font-normal text-base text-muted-foreground tracking-normal">
											/ 100
										</span>
									</p>
								</div>
								<p className="max-w-[16rem] text-right text-muted-foreground text-sm">
									Average quality of your {insights.sent}{" "}
									{insights.sent === 1 ? "message" : "messages"};{" "}
									{insights.clean} needed no touch-ups at all.
								</p>
							</div>
							{/* Decorative: the score itself is announced by the number above. */}
							<div
								aria-hidden="true"
								className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
							>
								<div
									className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
									style={{ width: `${insights.score}%` }}
								/>
							</div>
						</section>

						<section
							aria-label="Highlights"
							className="mt-6 grid grid-cols-3 gap-2.5"
						>
							<StatTile value={insights.sent} label="Messages sent" />
							<StatTile
								value={
									insights.toneMatch === null ? "–" : `${insights.toneMatch}%`
								}
								label="Tone matched the room"
							/>
							<StatTile
								value={insights.gems.length}
								label="Phrases worth keeping"
							/>
						</section>

						{insights.practice.length > 0 && (
							<section aria-label="What to practice" className="mt-10">
								<h2 className="font-semibold text-lg tracking-tight">
									What to practice
								</h2>
								<ul className="mt-3 space-y-2">
									{insights.practice.map((tip) => (
										<PracticeItem key={`${tip.title}:${tip.quote}`} tip={tip} />
									))}
								</ul>
							</section>
						)}

						{insights.gems.length > 0 && (
							<section aria-label="Phrases worth keeping" className="mt-10">
								<h2 className="font-semibold text-lg tracking-tight">
									Phrases worth keeping
								</h2>
								<ul className="mt-3 space-y-2">
									{insights.gems.map((tip) => (
										<li
											key={tip.quote}
											className="rounded-xl bg-muted/40 px-4 py-3"
										>
											<p className="text-sm">
												<span className="rounded-[0.2em] bg-[#FFD94A]/50 px-[0.15em] py-[0.1em] font-medium [box-decoration-break:clone]">
													{tip.quote}
												</span>
											</p>
											<p className="mt-1 text-muted-foreground text-sm">
												{tip.detail}
											</p>
										</li>
									))}
								</ul>
							</section>
						)}
					</>
				)}

				<div className="mt-10 flex items-center gap-3">
					<Button
						nativeButton={false}
						render={<Link to="/session/$sessionId" params={{ sessionId }} />}
					>
						<MessageCircle />
						Keep practicing
					</Button>
					<Button variant="ghost" nativeButton={false} render={<Link to="/" />}>
						Done
					</Button>
				</div>
			</main>
		</div>
	);
}

function StatTile({ value, label }: { value: string | number; label: string }) {
	return (
		<div className="rounded-2xl bg-muted/50 px-4 py-3.5">
			<p className="font-semibold text-2xl tabular-nums tracking-tight">
				{value}
			</p>
			<p className="mt-0.5 text-muted-foreground text-xs">{label}</p>
		</div>
	);
}

function PracticeItem({ tip }: { tip: CoachTip }) {
	return (
		<li className="rounded-xl bg-muted/40 px-4 py-3">
			<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
				<span
					className={cn("size-1.5 rounded-full", KIND_DOT[tip.kind])}
					aria-hidden="true"
				/>
				{KIND_LABEL[tip.kind]}
			</p>
			{tip.correction ? (
				<p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
					<s className="break-words text-muted-foreground decoration-red-400/70">
						{tip.quote}
					</s>
					<MoveRight
						className="size-3.5 shrink-0 text-muted-foreground/60"
						aria-hidden="true"
					/>
					<span className="break-words font-medium text-green-700">
						{tip.correction}
					</span>
				</p>
			) : (
				<p className="mt-1.5 font-medium text-sm">{tip.title}</p>
			)}
			<p className="mt-1 text-muted-foreground text-sm">{tip.detail}</p>
		</li>
	);
}
