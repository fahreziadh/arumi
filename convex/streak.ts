/**
 * Consecutive practice days, counting back from today. A new day that is still
 * empty does not break a run, so the count may end at yesterday.
 */
export function currentStreak(
	activeDays: ReadonlySet<number>,
	today: number,
): number {
	const yesterday = today - 1;
	let day = activeDays.has(today) ? today : yesterday;
	let streak = 0;
	while (activeDays.has(day)) {
		streak++;
		day--;
	}
	return streak;
}
