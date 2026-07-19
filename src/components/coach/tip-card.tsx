import { MoveRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CoachKind, CoachTip } from "@/lib/coach";
import { cn } from "@/lib/utils";

export const KIND_LABEL: Record<CoachKind, string> = {
	fix: "Quick fix",
	tip: "Tip",
	tone: "Tone check",
	gem: "Worth keeping",
};

export const KIND_DOT: Record<CoachKind, string> = {
	fix: "bg-red-400",
	tip: "bg-amber-400",
	tone: "bg-violet-400",
	gem: "bg-[#FFD94A]",
};

export function CoachTipBody({
	tip,
	rewrite,
}: {
	tip: CoachTip;
	rewrite?: string | null;
}) {
	const [revealed, setRevealed] = useState(false);

	return (
		<div>
			<p className="flex items-center gap-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wide">
				<span
					className={cn("size-1.5 rounded-full", KIND_DOT[tip.kind])}
					aria-hidden="true"
				/>
				{KIND_LABEL[tip.kind]}
			</p>
			{tip.correction ? (
				<p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
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
				<p className="mt-2 font-medium text-sm">
					{tip.kind === "gem" ? `“${tip.quote}”` : tip.title}
				</p>
			)}
			<p className="mt-1.5 text-pretty text-muted-foreground text-sm leading-relaxed">
				{tip.detail}
			</p>
			{rewrite &&
				(revealed ? (
					<div className="fade-in slide-in-from-bottom-1 mt-3 animate-in rounded-xl bg-muted/60 px-3 py-2.5 duration-200 motion-reduce:animate-none">
						<p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
							A fluent way to put it
						</p>
						<p className="mt-1 break-words text-sm leading-relaxed">
							{rewrite}
						</p>
					</div>
				) : (
					<Button
						variant="secondary"
						size="sm"
						className="mt-3"
						onClick={() => setRevealed(true)}
					>
						Say it better
					</Button>
				))}
		</div>
	);
}
