import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import { LogOut, Settings2 } from "lucide-react";
import { ArumiMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";

export function Wordmark() {
	return (
		<Link
			to="/"
			className="flex items-center gap-2 rounded-md font-semibold text-lg tracking-tight outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<ArumiMark />
			arumi
		</Link>
	);
}

export function AppHeader() {
	const { isAuthenticated } = useConvexAuth();
	const { signOut } = useAuthActions();
	const isAdmin = useQuery(api.admin.isAdmin, isAuthenticated ? {} : "skip");

	return (
		<header>
			<div className="flex h-16 items-center gap-1 px-4 sm:px-6">
				<Wordmark />
				<span className="flex-1" />
				{isAdmin && (
					<Button
						variant="ghost"
						size="sm"
						nativeButton={false}
						render={<Link to="/admin" />}
					>
						<Settings2 />
						Admin
					</Button>
				)}
				{isAuthenticated && (
					<Button
						variant="ghost"
						size="icon"
						aria-label="Sign out"
						onClick={() => void signOut()}
					>
						<LogOut />
					</Button>
				)}
			</div>
		</header>
	);
}
