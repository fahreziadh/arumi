import type { ReactNode } from "react";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import type { CoachKind, CoachTip } from "@/lib/coach";
import { CoachTipBody } from "./tip-card";

const MARK_CLASS: Record<CoachKind, string> = {
	fix: "cursor-help underline decoration-2 decoration-red-400/80 decoration-wavy underline-offset-4",
	tip: "cursor-help underline decoration-2 decoration-amber-400/90 decoration-wavy underline-offset-4",
	tone: "cursor-help underline decoration-2 decoration-violet-400/80 decoration-wavy underline-offset-4",
	gem: "cursor-help rounded-[0.2em] bg-[#FFD94A]/50 box-decoration-clone px-[0.15em] py-[0.1em] -mx-[0.05em]",
};

function Mark({
	label,
	tip,
	rewrite,
}: {
	label: string;
	tip: CoachTip;
	rewrite?: string | null;
}) {
	return (
		<HoverCard>
			<HoverCardTrigger
				delay={150}
				render={<span className={MARK_CLASS[tip.kind]}>{label}</span>}
			/>
			<HoverCardContent side="top" sideOffset={6} className="w-80">
				<CoachTipBody tip={tip} rewrite={tip.kind === "gem" ? null : rewrite} />
			</HoverCardContent>
		</HoverCard>
	);
}

// tips must be sorted and non-overlapping (the server guarantees it).
export function CoachMarkedText({
	text,
	tips,
	rewrite,
	analyzing = false,
}: {
	text: string;
	tips: CoachTip[];
	rewrite?: string | null;
	analyzing?: boolean;
}) {
	if (analyzing) return <span className="coach-scan">{text}</span>;
	if (tips.length === 0) return text;
	const nodes: ReactNode[] = [];
	let cursor = 0;
	for (const tip of tips) {
		if (tip.start < cursor || tip.end > text.length) continue;
		if (tip.start > cursor) nodes.push(text.slice(cursor, tip.start));
		nodes.push(
			<Mark
				key={`${tip.start}:${tip.kind}`}
				label={text.slice(tip.start, tip.end)}
				tip={tip}
				rewrite={rewrite}
			/>,
		);
		cursor = tip.end;
	}
	nodes.push(text.slice(cursor));
	return <>{nodes}</>;
}
