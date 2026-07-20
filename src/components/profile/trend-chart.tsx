import { cn } from "@/lib/utils";

export interface TrendWeek {
	weeksAgo: number;
	score: number | null;
	analyzed: number;
	messages: number;
}

const MIN_POSSIBLE_SCORE = 40;
const MIN_BAR_PERCENT = 6;

function barHeightPercent(score: number) {
	const ofRange =
		((score - MIN_POSSIBLE_SCORE) / (100 - MIN_POSSIBLE_SCORE)) * 100;
	return Math.max(MIN_BAR_PERCENT, ofRange);
}

/** Weeks with nothing graded render as an empty slot, so a week off never reads as a collapse. */
export function TrendChart({ weeks }: { weeks: TrendWeek[] }) {
	const scoredWeeks = weeks.filter((week) => week.score !== null);
	if (scoredWeeks.length < 2) return null;

	return (
		<figure className="mt-5">
			<div className="flex h-24 items-end gap-1.5" aria-hidden="true">
				{weeks.map((week) => (
					<div
						key={week.weeksAgo}
						className="flex flex-1 flex-col justify-end"
						title={
							week.score === null
								? "No messages graded"
								: `${week.score} / 100 across ${week.analyzed} messages`
						}
					>
						{week.score === null ? (
							<div className="h-1.5 rounded-full bg-foreground/5" />
						) : (
							<div
								className={cn(
									"rounded-lg transition-[height] duration-500",
									week.weeksAgo === 0 ? "bg-foreground/70" : "bg-foreground/20",
								)}
								style={{ height: `${barHeightPercent(week.score)}%` }}
							/>
						)}
					</div>
				))}
			</div>
			<figcaption className="mt-2 flex justify-between text-muted-foreground text-xs">
				<span>{weeks.length} weeks ago</span>
				<span>This week</span>
			</figcaption>
		</figure>
	);
}
