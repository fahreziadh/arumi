import { useSyncExternalStore } from "react";

const STORAGE_KEY = "arumi:settings:v1";

export interface Settings {
	/** Coach cards that point out useful phrases in the partner's replies. */
	aiHighlights: boolean;
	/** Coach cards with feedback on the message you just sent. */
	submissionHighlights: boolean;
}

const defaults: Settings = { aiHighlights: true, submissionHighlights: true };

function load(): Settings {
	if (typeof localStorage === "undefined") return defaults;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaults;
		return { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) };
	} catch {
		return defaults;
	}
}

let settings: Settings = load();
const listeners = new Set<() => void>();

export function updateSettings(patch: Partial<Settings>): void {
	settings = { ...settings, ...patch };
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
	} catch {
		// Storage unavailable; settings still apply for this session.
	}
	for (const l of listeners) l();
}

export function useSettings(): Settings {
	return useSyncExternalStore(
		(cb) => {
			listeners.add(cb);
			return () => listeners.delete(cb);
		},
		() => settings,
		() => settings,
	);
}
