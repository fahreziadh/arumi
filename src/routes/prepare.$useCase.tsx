import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation, useQuery } from "convex/react";
import {
	ArrowLeft,
	ArrowRight,
	ArrowUp,
	Pencil,
	RotateCcw,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { RequireAuth } from "@/components/auth-gate";
import { InklishMark } from "@/components/logo";
import { NotFoundState } from "@/components/not-found-state";
import { PlatformIcon } from "@/components/platform-icon";
import { PlatformTile } from "@/components/platform-tile";
import { LimitNotice } from "@/components/rooms/limit-notice";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { platformTheme } from "@/lib/platform-theme";
import { getUseCase } from "@/lib/use-cases";
import { useDailyLimit } from "@/lib/use-daily-limit";
import { MAX_FOLLOW_UPS, usePreparation } from "@/lib/use-preparation";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/prepare/$useCase")({
	component: PreparePage,
});

function PreparePage() {
	return (
		<RequireAuth>
			<PrepareFlow />
		</RequireAuth>
	);
}

function WordFade({ text }: { text: string }) {
	return (
		<>
			{text.split(/\s+/).map((word, i) => (
				// Spaces live outside the spans; inline-block collapses them inside.
				<Fragment
					// biome-ignore lint/suspicious/noArrayIndexKey: words are static per text
					key={`${i}-${word}`}
				>
					<span
						className="word-in"
						style={{ animationDelay: `${Math.min(i * 45, 1200)}ms` }}
					>
						{word}
					</span>{" "}
				</Fragment>
			))}
		</>
	);
}

// Typed transition: CSS scopes the animation to the question zone only.
function withTransition(apply: () => void) {
	const update = () => flushSync(apply);
	const svt = document.startViewTransition?.bind(document) as
		| ((
				options: (() => void) | { update: () => void; types: string[] },
		  ) => void)
		| undefined;
	if (!svt) {
		apply();
		return;
	}
	try {
		svt({ update, types: ["prep-step"] });
	} catch {
		svt(update);
	}
}

/** What a picked template or a finished interview boils down to. */
interface ScenarioPick {
	topic: string;
	personaName: string;
	personaRole: string;
}

function PrepareFlow() {
	const { useCase } = Route.useParams();
	const navigate = useNavigate();
	const found = getUseCase(useCase);
	const createConversation = useMutation(api.conversations.create);
	const [starting, setStarting] = useState(false);
	const limit = useDailyLimit();

	const templates = useQuery(
		api.templates.forPlatform,
		found ? { platform: found.platform } : "skip",
	);
	const [picked, setPicked] = useState<ScenarioPick | null>(null);

	const refine = useAction(api.prepare.refine);
	const [editOpen, setEditOpen] = useState(false);
	const [editDraft, setEditDraft] = useState("");
	const [editBusy, setEditBusy] = useState(false);
	const [editError, setEditError] = useState<string | null>(null);

	const prep = usePreparation(
		found?.platform ?? "custom",
		found?.label ?? "",
		withTransition,
	);
	const [draft, setDraft] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!prep.done && prep.question) inputRef.current?.focus();
	}, [prep.question, prep.done]);

	if (!found) {
		return <NotFoundState title="That format doesn't exist." />;
	}

	// A maxed-out user can't run the session they'd be preparing for.
	if (limit?.limited) {
		return (
			<div className="flex h-dvh flex-col">
				<header className="vt-room-header flex h-14 shrink-0 items-center gap-2 px-2 sm:px-4">
					<Button
						variant="ghost"
						size="icon"
						aria-label="Back to home"
						nativeButton={false}
						render={<Link to="/" />}
					>
						<ArrowLeft />
					</Button>
					<PlatformTile platform={found.platform} size="sm" morph />
					<span className="font-medium text-sm">{found.label}</span>
				</header>
				<main className="flex flex-1 items-center justify-center px-4">
					<LimitNotice
						limit={limit.limit}
						resetAt={limit.resetAt}
						className="w-full max-w-md"
					/>
				</main>
			</div>
		);
	}

	const theme = platformTheme[found.platform];

	// One confirmation screen serves both paths: a picked template or a
	// finished interview.
	const ready = picked
		? {
				topic: picked.topic,
				partner:
					picked.personaName && picked.personaRole
						? { name: picked.personaName, role: picked.personaRole }
						: null,
			}
		: prep.done
			? { topic: prep.topic, partner: prep.partner }
			: null;

	// The list only accompanies the very first question; once the learner
	// starts answering (or picks a template), the interview owns the screen.
	// Layout keys off the step alone, never off the list: `templates` is
	// undefined until the query lands, and letting that decide would settle
	// the page centered and then jerk it upward when the rows arrive.
	const templateList = templates ?? [];
	const onFirstQuestion = !ready && prep.stepCount === 1;

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = draft.trim();
		if (!text || prep.thinking) return;
		setDraft("");
		void prep.answer(text);
		inputRef.current?.focus();
	};

	// The AI applies the requested change; the result lands in `picked`, so
	// it works the same whether the scenario came from a template or the
	// interview (and Back returns to the unedited version).
	const applyEdit = async () => {
		if (!ready || editBusy) return;
		const instruction = editDraft.trim();
		if (!instruction) return;
		setEditBusy(true);
		setEditError(null);
		try {
			const revised = await refine({
				platformLabel: prep.platformLabel,
				topic: ready.topic,
				personaName: ready.partner?.name ?? "",
				personaRole: ready.partner?.role ?? "",
				instruction,
			});
			withTransition(() =>
				setPicked({
					topic: revised.topic,
					personaName: revised.partnerName,
					personaRole: revised.partnerRole,
				}),
			);
			setEditOpen(false);
			setEditDraft("");
		} catch (err) {
			setEditError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setEditBusy(false);
		}
	};

	const start = async () => {
		if (starting || !ready) return;
		setStarting(true);
		try {
			const id = await createConversation({
				platform: found.platform,
				platformLabel: prep.platformLabel,
				topic: ready.topic,
				personaName: ready.partner?.name,
				personaRole: ready.partner?.role,
			});
			await navigate({
				to: "/session/$sessionId",
				params: { sessionId: id },
				replace: true,
			});
		} finally {
			setStarting(false);
		}
	};

	return (
		<div className="flex h-dvh flex-col">
			<header className="vt-room-header flex h-14 shrink-0 items-center gap-2 px-2 sm:px-4">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Back to home"
					nativeButton={false}
					render={<Link to="/" />}
				>
					<ArrowLeft />
				</Button>
				<PlatformTile platform={found.platform} size="sm" morph />
				<span className="font-medium text-sm">{found.label}</span>
				{/* Step dots only make sense while the interview is running. */}
				{!picked && (
					<span className="ml-auto pr-2">
						<span className="sr-only">
							Step {Math.min(prep.stepCount, MAX_FOLLOW_UPS + 1)} of{" "}
							{MAX_FOLLOW_UPS + 1}
						</span>
						<span className="flex items-center gap-1" aria-hidden>
							{Array.from({ length: MAX_FOLLOW_UPS + 1 }, (_, i) => (
								<span
									// biome-ignore lint/suspicious/noArrayIndexKey: fixed-size dots
									key={i}
									className={cn(
										"size-1.5 rounded-full",
										i < prep.stepCount ? "bg-foreground" : "bg-border",
									)}
								/>
							))}
						</span>
					</span>
				)}
			</header>

			<main className="flex-1 overflow-y-auto overscroll-contain">
				{/* On the first question the flow starts high, leaving room for
				    the template list; afterwards the question zone sits at the
				    optical center (pb compensates its reserved space). */}
				<div
					className={cn(
						"mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 sm:px-6",
						onFirstQuestion ? "pt-4 pb-16 sm:pt-6" : "justify-center pb-36",
					)}
				>
					<h1 className="sr-only">Prepare your {found.label} session</h1>

					{/* min-h keeps the input still between steps. */}
					<div
						aria-live="polite"
						className="prep-question flex min-h-36 items-end justify-center"
					>
						{!ready && (
							<div className="coach-bubble relative mb-2 w-full max-w-md rounded-2xl rounded-bl-sm bg-popover px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.06),0_2px_6px_rgb(0,0,0,0.03)]">
								<svg
									viewBox="0 0 8 12"
									aria-hidden="true"
									className="-left-1.5 -scale-x-100 -scale-y-100 absolute bottom-0 h-3 w-2 fill-popover"
								>
									<path d="M0 0h8L2 10C1.2 6.5 0.8 3.2 0 0z" />
								</svg>
								<div className="flex items-start gap-3">
									<InklishMark className="mt-0.5 size-6 shrink-0" />
									<div className="min-w-0 flex-1">
										{prep.thinking && (
											<span className="flex items-center gap-1 py-2 text-muted-foreground">
												<span className="sr-only">
													Thinking about your answer…
												</span>
												<span
													className="typing-dot size-1.5 rounded-full bg-current"
													aria-hidden="true"
												/>
												<span
													className="typing-dot size-1.5 rounded-full bg-current"
													aria-hidden="true"
												/>
												<span
													className="typing-dot size-1.5 rounded-full bg-current"
													aria-hidden="true"
												/>
											</span>
										)}
										{prep.error && (
											<>
												<p className="text-pretty font-medium text-destructive text-sm">
													{prep.error}
												</p>
												<Button
													variant="secondary"
													size="sm"
													className="mt-3"
													onClick={() => void prep.retry()}
												>
													Try again
												</Button>
											</>
										)}
										{prep.question && (
											<p
												key={prep.question}
												className="text-pretty font-medium text-lg leading-snug"
											>
												<WordFade text={prep.question} />
											</p>
										)}
									</div>
								</div>
							</div>
						)}
						{ready && (
							<div className="text-center">
								<span
									className={cn(
										"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium text-xs",
										theme.tile,
									)}
								>
									<PlatformIcon
										platform={found.platform}
										className="size-3.5"
									/>
									{prep.platformLabel}
								</span>
								<p
									className={cn(
										"mx-auto mt-4 text-balance text-center font-semibold tracking-tight",
										// Long summaries trade size for width, keeping ~2 lines.
										ready.topic.length > 90
											? "text-xl sm:text-2xl"
											: "text-2xl sm:text-3xl",
									)}
								>
									{ready.topic}
								</p>
								{ready.partner && (
									<p className="mt-3 text-muted-foreground text-sm">
										You'll be writing with{" "}
										<span className="font-medium text-foreground">
											{ready.partner.name}
										</span>
										, {ready.partner.role.toLowerCase()}
									</p>
								)}
							</div>
						)}
					</div>

					{!ready && (
						<>
							<form
								onSubmit={submit}
								className="vt-composer mx-auto mt-5 w-full max-w-xl"
								aria-label="Answer the question"
							>
								<div className="relative">
									{/* Never disabled: that would eject focus on every AI turn. */}
									<Input
										ref={inputRef}
										value={draft}
										onChange={(e) => setDraft(e.target.value)}
										placeholder={
											prep.thinking ? "One moment…" : "Type your answer…"
										}
										aria-label="Your answer"
										autoComplete="off"
										autoFocus
										className="h-14 rounded-full pr-16 pl-6 text-base"
									/>
									<Button
										type="submit"
										size="icon"
										aria-label="Send answer"
										disabled={!draft.trim() || prep.thinking}
										className="-translate-y-1/2 absolute top-1/2 right-2.5 rounded-full"
									>
										<ArrowUp />
									</Button>
								</div>
							</form>
							{/* Matches the composer's width and text inset, so the
							    divider, the input and the rows share one edge. */}
							{onFirstQuestion && templateList.length > 0 && (
								<div className="prep-templates mx-auto mt-10 w-full max-w-xl">
									<h2 className="px-6 text-muted-foreground text-sm">
										Or start from a ready-made scenario
									</h2>
									<ul className="mt-2">
										{templateList.map((template, i) => (
											<li
												key={template.title}
												className="template-in"
												// Cascade the first few, then land the rest together.
												style={{ animationDelay: `${Math.min(i * 45, 270)}ms` }}
											>
												<button
													type="button"
													onClick={() =>
														withTransition(() => setPicked(template))
													}
													className="group flex w-full items-center gap-3 rounded-2xl px-6 py-3 text-left outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98]"
												>
													<span className="min-w-0 flex-1">
														<span className="block truncate font-medium text-base">
															{template.title}
														</span>
														<span className="mt-0.5 block truncate text-muted-foreground text-sm">
															{template.description}
														</span>
													</span>
													{/* Visible at rest so the rows keep a right edge
													    under the composer, not just on hover. */}
													<ArrowRight
														className="size-4 shrink-0 text-muted-foreground opacity-30 transition-[opacity,transform] duration-150 ease-out group-focus-visible:translate-x-0.5 group-focus-visible:opacity-100 group-hover:translate-x-0.5 group-hover:opacity-100"
														aria-hidden="true"
													/>
												</button>
											</li>
										))}
									</ul>
								</div>
							)}
						</>
					)}

					{ready && (
						<div className="prep-actions mt-8 flex justify-center gap-2">
							<Button
								size="lg"
								disabled={starting}
								onClick={() => void start()}
							>
								{starting ? "Starting…" : "Start session"}
							</Button>
							<Button
								size="lg"
								variant="ghost"
								onClick={() => {
									setEditError(null);
									setEditOpen(true);
								}}
							>
								<Pencil />
								Edit
							</Button>
							{picked ? (
								<Button
									size="lg"
									variant="ghost"
									onClick={() => withTransition(() => setPicked(null))}
								>
									<ArrowLeft />
									Back
								</Button>
							) : (
								<Button size="lg" variant="ghost" onClick={prep.restart}>
									<RotateCcw />
									Start over
								</Button>
							)}
						</div>
					)}
				</div>
			</main>

			<Dialog open={editOpen} onOpenChange={setEditOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change the scenario</DialogTitle>
						<DialogDescription>
							Tell the coach what to change; everything else stays as it is.
						</DialogDescription>
					</DialogHeader>
					<form
						className="grid gap-4"
						onSubmit={(e) => {
							e.preventDefault();
							void applyEdit();
						}}
					>
						<Textarea
							value={editDraft}
							onChange={(e) => setEditDraft(e.target.value)}
							rows={3}
							autoFocus
							placeholder='e.g. "One week instead of two" or "Make the manager harder to convince"'
							aria-label="What do you want to change?"
							className="text-base"
						/>
						{editError && (
							<p className="text-destructive text-sm">{editError}</p>
						)}
						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								disabled={editBusy}
								onClick={() => setEditOpen(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={editBusy || !editDraft.trim()}>
								{editBusy ? "Updating…" : "Update scenario"}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
