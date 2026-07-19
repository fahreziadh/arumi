import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/report/$sessionId")({
	beforeLoad: () => {
		throw redirect({ to: "/" });
	},
});
