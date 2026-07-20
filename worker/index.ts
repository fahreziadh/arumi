interface Env {
	ASSETS: { fetch: typeof fetch };
}

const BASE = "/inklish";

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		if (url.pathname === BASE || url.pathname.startsWith(`${BASE}/`)) {
			url.pathname = url.pathname.slice(BASE.length) || "/";
			return env.ASSETS.fetch(new Request(url, request));
		}
		// Route pattern `/inklish*` also catches paths like /inklishfoo —
		// hand those back to the zone origin (the portfolio site).
		return fetch(request);
	},
};
