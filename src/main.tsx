import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";
import ReactDOM from "react-dom/client";
import { env } from "./lib/env";
import { routeTree } from "./routeTree.gen";

const convex = new ConvexReactClient(env.CONVEX_URL);

const router = createRouter({
	routeTree,
	basepath: "/inklish",
	defaultPreload: "intent",
	scrollRestoration: true,
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// biome-ignore lint/style/noNonNullAssertion: #app is always in index.html
const rootElement = document.getElementById("app")!;

ReactDOM.createRoot(rootElement).render(
	<ConvexAuthProvider
		client={convex}
		replaceURL={(to) => router.history.replace(to)}
	>
		<RouterProvider router={router} />
	</ConvexAuthProvider>,
);
