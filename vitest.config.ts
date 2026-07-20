import { defineConfig } from "vitest/config";

/**
 * Convex functions must run under edge-runtime, the way they do in
 * production; the pure modules under src/ run under plain node.
 */
export default defineConfig({
	test: {
		projects: [
			{
				test: {
					name: "convex",
					include: ["convex/**/*.test.ts"],
					environment: "edge-runtime",
					server: { deps: { inline: ["convex-test"] } },
				},
			},
			{
				test: {
					name: "src",
					include: ["src/**/*.test.ts"],
					environment: "node",
				},
			},
		],
	},
});
