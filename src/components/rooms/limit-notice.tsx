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
			<p className="mt-2 text-muted-foreground text-xs">
				Need them sooner?{" "}
				<a
					href="https://x.com/fahreziadhaa"
					target="_blank"
					rel="noreferrer"
					className="font-medium text-foreground underline underline-offset-4"
				>
					Ping me on X
				</a>{" "}
				and I'll raise your limit.
			</p>
		</output>
	);
}
