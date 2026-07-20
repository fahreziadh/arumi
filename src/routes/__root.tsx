import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { useEffect } from "react";

import "../styles.css";

export const Route = createRootRoute({
	component: RootComponent,
});

function RootComponent() {
	// The boot splash in index.html stays up until the code-split route
	// content has actually committed, not just until React mounts.
	const status = useRouterState({ select: (s) => s.status });
	useEffect(() => {
		if (status !== "idle") return;
		const splash = document.getElementById("splash");
		if (!splash) return;
		splash.style.opacity = "0";
		const timer = setTimeout(() => splash.remove(), 300);
		return () => clearTimeout(timer);
	}, [status]);

	return (
		<>
			<Outlet />
			{import.meta.env.DEV && import.meta.env.MODE !== "test" && (
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "TanStack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
			)}
		</>
	);
}
