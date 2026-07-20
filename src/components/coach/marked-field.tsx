import type React from "react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { DraftPraise } from "@/components/coach/draft-praise";
import { CoachTipBody } from "@/components/coach/tip-card";
import { HoverCard, HoverCardContent } from "@/components/ui/hover-card";
import { Textarea, textareaBaseClass } from "@/components/ui/textarea";
import { type CoachKind, type CoachTip, draftMarks } from "@/lib/coach";
import type { DraftCoach } from "@/lib/use-draft-coach";
import { cn } from "@/lib/utils";

const MARK_CLASS: Record<CoachKind, string> = {
	fix: "underline decoration-2 decoration-red-400/80 decoration-wavy underline-offset-4",
	tip: "underline decoration-2 decoration-amber-400/90 decoration-wavy underline-offset-4",
	tone: "underline decoration-2 decoration-violet-400/80 decoration-wavy underline-offset-4",
	gem: "underline decoration-2 decoration-[#FFD94A] decoration-wavy underline-offset-4",
};

const CLICK_THROUGH_OVERLAY_CLASS =
	"pointer-events-none absolute inset-0 m-0! select-none overflow-hidden border-transparent bg-transparent text-transparent";

/**
 * The shared base class is a flex container, which would lay each line out as
 * a row item and eat the newlines the textarea renders.
 */
const OVERLAY_BLOCK_LAYOUT_CLASS = "block whitespace-pre-wrap break-words";

const POINTER_TRAVEL_GRACE_MS = 120;

/** A textarea keeps the height of a trailing newline; a block element does not. */
const TRAILING_NEWLINE_SPACER = "​";

interface HoveredMark {
	tip: CoachTip;
	anchor: HTMLElement;
}

function markedNodes(value: string, tips: CoachTip[]): ReactNode[] {
	const nodes: ReactNode[] = [];
	let cursor = 0;
	tips.forEach((tip, index) => {
		if (tip.start < cursor || tip.end > value.length) return;
		if (tip.start > cursor) nodes.push(value.slice(cursor, tip.start));
		nodes.push(
			<span
				key={`${tip.start}:${tip.kind}`}
				data-tip-index={index}
				className={MARK_CLASS[tip.kind]}
			>
				{value.slice(tip.start, tip.end)}
			</span>,
		);
		cursor = tip.end;
	});
	nodes.push(value.slice(cursor));
	if (value.endsWith("\n")) nodes.push(TRAILING_NEWLINE_SPACER);
	return nodes;
}

function useScrollSync(
	overlay: React.RefObject<HTMLDivElement | null>,
	field: React.RefObject<HTMLElement | null>,
	value: string,
) {
	const sync = () => {
		if (!overlay.current || !field.current) return;
		overlay.current.scrollTop = field.current.scrollTop;
		overlay.current.scrollLeft = field.current.scrollLeft;
	};
	// Typing can scroll the field without emitting a scroll event.
	// biome-ignore lint/correctness/useExhaustiveDependencies: re-sync per keystroke
	useEffect(sync, [value, overlay, field]);
	return sync;
}

function rectContainsPointer(rect: DOMRect, event: React.PointerEvent) {
	return (
		event.clientX >= rect.left &&
		event.clientX <= rect.right &&
		event.clientY >= rect.top &&
		event.clientY <= rect.bottom
	);
}

function markUnderPointer(
	overlay: React.RefObject<HTMLDivElement | null>,
	tips: CoachTip[],
	event: React.PointerEvent,
): HoveredMark | null {
	const marks =
		overlay.current?.querySelectorAll<HTMLElement>("[data-tip-index]");
	for (const mark of marks ?? []) {
		for (const lineRect of mark.getClientRects()) {
			if (!rectContainsPointer(lineRect, event)) continue;
			const tip = tips[Number(mark.dataset.tipIndex)];
			if (tip) return { tip, anchor: mark };
		}
	}
	return null;
}

/**
 * The marks stay click-through and the pointer is hit-tested against their
 * rects instead. Making them interactive would be simpler, but it would steal
 * clicks meant to put the caret in the middle of a word.
 */
function useMarkHover(
	overlay: React.RefObject<HTMLDivElement | null>,
	tips: CoachTip[],
) {
	const [hovered, setHovered] = useState<HoveredMark | null>(null);
	const closeTimer = useRef<number | null>(null);

	const cancelClose = () => {
		if (closeTimer.current !== null) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
	};
	const scheduleClose = () => {
		cancelClose();
		closeTimer.current = window.setTimeout(
			() => setHovered(null),
			POINTER_TRAVEL_GRACE_MS,
		);
	};

	useEffect(
		() => () => {
			if (closeTimer.current !== null) {
				window.clearTimeout(closeTimer.current);
			}
		},
		[],
	);
	// A mark the pointer was resting on can vanish when the draft changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: tips identity is the signal
	useEffect(() => setHovered(null), [tips]);

	const onPointerMove = (event: React.PointerEvent) => {
		const mark = markUnderPointer(overlay, tips, event);
		if (!mark) {
			if (hovered) scheduleClose();
			return;
		}
		cancelClose();
		setHovered((prev) =>
			prev?.tip === mark.tip && prev.anchor === mark.anchor ? prev : mark,
		);
	};

	return {
		hovered,
		fieldProps: { onPointerMove, onPointerLeave: scheduleClose },
		cardProps: { onMouseEnter: cancelClose, onMouseLeave: scheduleClose },
	};
}

function MarkCard({
	hovered,
	rewrite,
	onApplyRewrite,
	cardProps,
}: {
	hovered: HoveredMark | null;
	rewrite: string | null;
	onApplyRewrite?: (text: string) => void;
	cardProps: { onMouseEnter: () => void; onMouseLeave: () => void };
}) {
	return (
		<HoverCard open={hovered !== null}>
			{hovered && (
				<HoverCardContent
					anchor={hovered.anchor}
					side="top"
					sideOffset={6}
					className="w-80"
					{...cardProps}
				>
					<CoachTipBody
						tip={hovered.tip}
						rewrite={hovered.tip.kind === "gem" ? null : rewrite}
						onApplyRewrite={onApplyRewrite}
					/>
				</HoverCardContent>
			)}
		</HoverCard>
	);
}

interface CoachedFieldProps {
	coach: DraftCoach;
	value: string;
	/** Lets the learner adopt the coach's rewrite from inside the card. */
	onApplyRewrite?: (text: string) => void;
}

/**
 * A textarea cannot style its own content, so coach marks are painted by a
 * transparent layer sitting exactly on top of it. The layer goes ABOVE the
 * field rather than behind it: behind, any field background would hide the
 * marks and every caller would have to go transparent and give up its focus
 * styling.
 */
export function CoachedTextarea({
	coach,
	value,
	onApplyRewrite,
	className,
	...props
}: Omit<React.ComponentProps<"textarea">, "value"> & CoachedFieldProps) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const fieldRef = useRef<HTMLTextAreaElement>(null);
	const sync = useScrollSync(overlayRef, fieldRef, value);
	const tips = draftMarks(value, coach);
	const { hovered, fieldProps, cardProps } = useMarkHover(overlayRef, tips);
	const scanning = coach.pending;

	return (
		<div className="relative w-full min-w-0">
			<Textarea
				ref={fieldRef}
				value={value}
				onScroll={sync}
				className={className}
				{...fieldProps}
				{...props}
			/>
			{(scanning || tips.length > 0) && (
				<div
					ref={overlayRef}
					aria-hidden="true"
					className={cn(
						textareaBaseClass,
						className,
						CLICK_THROUGH_OVERLAY_CLASS,
						OVERLAY_BLOCK_LAYOUT_CLASS,
					)}
				>
					{scanning ? (
						<span className="coach-scan">{value}</span>
					) : (
						markedNodes(value, tips)
					)}
				</div>
			)}
			<MarkCard
				hovered={hovered}
				rewrite={coach.rewrite}
				onApplyRewrite={onApplyRewrite}
				cardProps={cardProps}
			/>
			<DraftPraise
				praiseCount={coach.praiseCount}
				className="right-3 bottom-3"
			/>
		</div>
	);
}
