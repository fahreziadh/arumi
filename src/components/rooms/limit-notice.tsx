import { resetLabel } from "@/lib/use-daily-limit";
import { cn } from "@/lib/utils";

export function LimitNotice({
	limit,
	resetAt,
	className,
}: {
	limit: number;
	resetAt: number;
	className?: string;
}) {
	return (
		<output
			className={cn(
				"block rounded-2xl bg-muted/60 px-5 py-4 text-center",
				className,
			)}
		>
			<p className="font-medium text-sm">
				You've used today's {limit} free messages.
			</p>
			<p className="mt-1 text-muted-foreground text-xs">
				More {resetLabel(resetAt)}. Everything you wrote stays right here.
			</p>
		</output>
	);
}
