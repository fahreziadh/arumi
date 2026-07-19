import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ArrowLeft, ArrowUp, Pencil } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { RequireAuth } from "@/components/auth-gate";
import { ArumiMark } from "@/components/logo";
import { NotFoundState } from "@/components/not-found-state";
import { PlatformIcon } from "@/components/platform-icon";
import { PlatformTile } from "@/components/platform-tile";
import { LimitNotice } from "@/components/rooms/limit-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function PrepareFlow() {
	const { useCase } = Route.useParams();
	const navigate = useNavigate();
	const found = getUseCase(useCase);
	const createConversation = useMutation(api.conversations.create);
	const [starting, setStarting] = useState(false);
	const limit = useDailyLimit();

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

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = draft.trim();
		if (!text || prep.thinking) return;
		setDraft("");
		void prep.answer(text);
		inputRef.current?.focus();
	};

	const start = async () => {
		if (starting) return;
		setStarting(true);
		try {
			const id = await createConversation({
				platform: found.platform,
				platformLabel: prep.platformLabel,
				topic: prep.topic,
				personaName: prep.partner?.name,
				personaRole: prep.partner?.role,
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
			</header>

			<main className="flex-1 overflow-y-auto overscroll-contain">
				{/* pb compensates the question zone's reserved space: optical center. */}
				<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 pb-36 sm:px-6">
					<h1 className="sr-only">Prepare your {found.label} session</h1>

					{/* min-h keeps the input still between steps. */}
					<div
						aria-live="polite"
						className="prep-question flex min-h-36 items-end justify-center"
					>
						{!prep.done && (
							<div className="coach-bubble relative mb-2 w-full max-w-md rounded-2xl rounded-bl-sm bg-popover px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.06),0_2px_6px_rgb(0,0,0,0.03)]">
								<svg
									viewBox="0 0 8 12"
									aria-hidden="true"
									className="-left-1.5 -scale-x-100 -scale-y-100 absolute bottom-0 h-3 w-2 fill-popover"
								>
									<path d="M0 0h8L2 10C1.2 6.5 0.8 3.2 0 0z" />
								</svg>
								<div className="flex items-start gap-3">
									<ArumiMark className="mt-0.5 size-6 shrink-0" />
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
						{prep.done && (
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
										prep.topic.length > 90
											? "text-xl sm:text-2xl"
											: "text-2xl sm:text-3xl",
									)}
								>
									{prep.topic}
								</p>
								{prep.partner && (
									<p className="mt-3 text-muted-foreground text-sm">
										You'll be writing with{" "}
										<span className="font-medium text-foreground">
											{prep.partner.name}
										</span>
										, {prep.partner.role.toLowerCase()}
									</p>
								)}
							</div>
						)}
					</div>

					{!prep.done && (
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
					)}

					{prep.done && (
						<div className="prep-actions mt-8 flex justify-center gap-2">
							<Button
								size="lg"
								disabled={starting}
								onClick={() => void start()}
							>
								{starting ? "Starting…" : "Start session"}
							</Button>
							<Button size="lg" variant="ghost" onClick={prep.restart}>
								<Pencil />
								Edit
							</Button>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}
