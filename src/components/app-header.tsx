import { Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { InklishMark } from "@/components/logo";
import { UserMenu } from "@/components/user-menu";
import { api } from "../../convex/_generated/api";

export function Wordmark() {
	return (
		<Link
			to="/"
			className="flex items-center gap-2 rounded-md font-semibold text-lg tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<InklishMark />
			inklish
		</Link>
	);
}

export function AppHeader() {
	const { isAuthenticated } = useConvexAuth();
	const isAdmin = useQuery(api.admin.isAdmin, isAuthenticated ? {} : "skip");

	return (
		<header>
			<div className="flex h-16 items-center gap-1 px-4 sm:px-6">
				<Wordmark />
				<span className="flex-1" />
				{/* Admin and sign-out moved inside the avatar menu. */}
				{isAuthenticated && <UserMenu isAdmin={isAdmin} />}
			</div>
		</header>
	);
}
