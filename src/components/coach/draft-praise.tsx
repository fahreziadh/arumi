import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const VISIBLE_MS = 2600;

/**
 * A transient "that reads well" when the coach finds nothing to flag, so a
 * clean draft does not look the same as a coach that is off, still thinking,
 * or broken. It floats over the field rather than sitting in the layout: it
 * must never move the composer under a learner mid-sentence.
 */
export function DraftPraise({
	praiseCount,
	className,
}: {
	praiseCount: number;
	className?: string;
}) {
	const [shownCount, setShownCount] = useState(0);

	useEffect(() => {
		if (praiseCount === 0) return;
		setShownCount(praiseCount);
		const timer = window.setTimeout(() => setShownCount(0), VISIBLE_MS);
		return () => window.clearTimeout(timer);
	}, [praiseCount]);

	if (shownCount === 0) return null;

	return (
		<output
			className={cn(
				"coach-praise pointer-events-none absolute flex items-center gap-1.5 text-muted-foreground text-xs",
				className,
			)}
		>
			<Check className="size-3.5 text-green-600" aria-hidden="true" />
			Reads well so far
		</output>
	);
}
