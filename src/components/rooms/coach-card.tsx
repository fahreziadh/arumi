import { Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { CoachTip } from "@/lib/coach";

/** Shared tip layout: sparkle badge, title, detail. Used by the floating
 * card (email/issue rooms) and the message hover cards (chat rooms). */
export function CoachTipBody({
	tip,
	showQuote = false,
}: {
	tip: CoachTip;
	showQuote?: boolean;
}) {
	return (
		<div className="flex items-start gap-3">
			<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FFD94A]/40 text-foreground">
				<Sparkles className="size-4" aria-hidden="true" />
			</span>
			<div className="min-w-0 flex-1">
				<p className="font-medium text-sm">{tip.title}</p>
				{showQuote && tip.kind === "submission" && (
					<p className="mt-1 line-clamp-2 break-words text-muted-foreground text-xs italic">
						“{tip.quote}”
					</p>
				)}
				<p className="mt-1.5 text-pretty text-sm leading-relaxed">
					{tip.detail}
				</p>
			</div>
		</div>
	);
}

export function CoachCard({
	tip,
	onDismiss,
}: {
	tip: CoachTip | null;
	onDismiss: () => void;
}) {
	useEffect(() => {
		if (!tip) return;
		const t = window.setTimeout(onDismiss, 9000);
		return () => window.clearTimeout(t);
	}, [tip, onDismiss]);

	return (
		<output className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4">
			{tip && (
				<div
					key={`${tip.kind}:${tip.quote}`}
					className="motion-reduce:animate-none fade-in slide-in-from-top-3 pointer-events-auto relative w-full max-w-md animate-in rounded-2xl bg-popover p-4 shadow-lg ring-1 ring-foreground/5 duration-300"
				>
					<CoachTipBody tip={tip} showQuote />
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label="Dismiss tip"
						onClick={onDismiss}
						className="absolute top-3 right-3"
					>
						<X />
					</Button>
				</div>
			)}
		</output>
	);
}
