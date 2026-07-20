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

// biome-ignore lint/style/noNonNullAssertion: Not sure why
const rootElement = document.getElementById("app")!;

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<ConvexAuthProvider client={convex}>
			<RouterProvider router={router} />
		</ConvexAuthProvider>,
	);
}
