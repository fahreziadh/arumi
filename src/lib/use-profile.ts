import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { DAY_MS } from "./use-daily-limit";

const currentUtcDay = () => Math.floor(Date.now() / DAY_MS);

/**
 * Profile stats for the signed-in user. The day is supplied by the browser
 * because a Convex query is not re-run just because time passed: a
 * server-side clock would anchor the streak and trend to whichever day the
 * result was first cached on.
 */
export function useProfile(enabled = true) {
	const [utcDay, setUtcDay] = useState(currentUtcDay);

	useEffect(() => {
		const msUntilRollover = (utcDay + 1) * DAY_MS - Date.now();
		const timer = window.setTimeout(
			() => setUtcDay(currentUtcDay),
			Math.max(1_000, msUntilRollover),
		);
		return () => window.clearTimeout(timer);
	}, [utcDay]);

	return useQuery(api.profile.mine, enabled ? { today: utcDay } : "skip");
}
