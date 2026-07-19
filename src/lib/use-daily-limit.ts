import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface DailyLimit {
	/** True once today's free messages are used up. */
	limited: boolean;
	/** 0 = unlimited. */
	limit: number;
	used: number;
	/** Epoch ms of the next UTC midnight, when the counter resets. */
	resetAt: number;
}

/**
 * Quota state for the signed-in user. The server reports raw counters
 * keyed by UTC day; the day comparison lives here so the lock lifts at
 * midnight without a server round trip.
 */
export function useDailyLimit(): DailyLimit | undefined {
	const usage = useQuery(api.usage.mine);
	const [todayKey, setTodayKey] = useState(() =>
		Math.floor(Date.now() / DAY_MS),
	);

	useEffect(() => {
		const untilRollover = (todayKey + 1) * DAY_MS - Date.now();
		const timer = window.setTimeout(
			() => setTodayKey(Math.floor(Date.now() / DAY_MS)),
			Math.max(1_000, untilRollover),
		);
		return () => window.clearTimeout(timer);
	}, [todayKey]);

	if (usage === undefined) return undefined;
	const resetAt = (todayKey + 1) * DAY_MS;
	if (usage === null || usage.limit <= 0) {
		return { limited: false, limit: 0, used: 0, resetAt };
	}
	const used = usage.dayKey === todayKey ? usage.messagesToday : 0;
	return { limited: used >= usage.limit, limit: usage.limit, used, resetAt };
}

export function resetLabel(resetAt: number): string {
	const hours = Math.ceil((resetAt - Date.now()) / 3_600_000);
	if (hours <= 1) return "in less than an hour";
	return `in about ${hours} hours`;
}
