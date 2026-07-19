import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowUp, Pencil } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { NotFoundState } from "@/components/not-found-state";
import { PlatformIcon } from "@/components/platform-icon";
import { PlatformTile } from "@/components/platform-tile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { platformTheme } from "@/lib/platform-theme";
import { localPreparation, MAX_FOLLOW_UPS } from "@/lib/preparation";
import { createConversation } from "@/lib/store";
import { getUseCase } from "@/lib/use-cases";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prepare/$useCase")({
	component: PreparePage,
});

function PreparePage() {
	const { useCase } = Route.useParams();
	const navigate = useNavigate();
	const found = getUseCase(useCase);

	const [state, setState] = useState(() =>
		localPreparation.begin(found?.platform ?? "custom", found?.label ?? ""),
	);
	const [draft, setDraft] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	if (!found) {
		return <NotFoundState title="That format doesn't exist." />;
	}

	const theme = platformTheme[found.platform];

	// Question swaps run as a typed transition so CSS can scope the animation
	// to the changed regions only; the header and input must not move.
	const withTransition = (apply: () => void) => {
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
	};

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = draft.trim();
		if (!text) return;
		withTransition(() => {
			setDraft("");
			setState((s) => localPreparation.answer(s, text));
		});
		inputRef.current?.focus();
	};

	const start = () => {
		const id = createConversation(localPreparation.result(state));
		navigate({
			to: "/session/$sessionId",
			params: { sessionId: id },
			replace: true,
		});
	};

	const restart = () => {
		withTransition(() => {
			setState(localPreparation.begin(found.platform, found.label));
		});
	};

	const stepCount = state.exchanges.length + (state.done ? 0 : 1);

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
						Step {Math.min(stepCount, MAX_FOLLOW_UPS + 1)} of{" "}
						{MAX_FOLLOW_UPS + 1}
					</span>
					<span className="flex items-center gap-1" aria-hidden>
						{Array.from({ length: MAX_FOLLOW_UPS + 1 }, (_, i) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed-size dots
								key={i}
								className={cn(
									"size-1.5 rounded-full",
									i < stepCount ? "bg-foreground" : "bg-border",
								)}
							/>
						))}
					</span>
				</span>
			</header>

			<main className="flex-1 overflow-y-auto overscroll-contain">
				<div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-center px-4 pb-14 sm:px-6">
					<h1 className="sr-only">Prepare your {found.label} session</h1>

					{/* One question at a time. The zone is bottom-aligned with a fixed
					    minimum height so the input below never moves between steps. */}
					<div
						aria-live="polite"
						className="prep-question flex min-h-32 items-end justify-center"
					>
						{state.question && (
							<p className="text-balance text-center font-semibold text-2xl tracking-tight sm:text-3xl">
								{state.question}
							</p>
						)}
						{state.done && (
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
									{localPreparation.result(state).platformLabel}
								</span>
								<p className="mx-auto mt-4 max-w-md text-balance text-center font-semibold text-2xl tracking-tight sm:text-3xl">
									{localPreparation.result(state).topic}
								</p>
							</div>
						)}
					</div>

					{!state.done && (
						<form
							onSubmit={submit}
							className="vt-composer mt-8"
							aria-label="Answer the question"
						>
							<div className="relative">
								<Input
									ref={inputRef}
									value={draft}
									onChange={(e) => setDraft(e.target.value)}
									placeholder="Type your answer…"
									aria-label="Your answer"
									autoComplete="off"
									autoFocus
									className="h-14 rounded-full pr-16 pl-6 text-base"
								/>
								<Button
									type="submit"
									size="icon"
									aria-label="Send answer"
									disabled={!draft.trim()}
									className="-translate-y-1/2 absolute top-1/2 right-2.5 rounded-full"
								>
									<ArrowUp />
								</Button>
							</div>
						</form>
					)}

					{state.done && (
						<div className="prep-actions mt-8 flex justify-center gap-2">
							<Button size="lg" onClick={start}>
								Start session
							</Button>
							<Button size="lg" variant="ghost" onClick={restart}>
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
