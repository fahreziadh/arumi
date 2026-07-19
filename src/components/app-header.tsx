import { Link } from "@tanstack/react-router";
import { ArumiMark } from "@/components/logo";

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
	return (
		<header>
			<div className="flex h-16 items-center px-4 sm:px-6">
				<Wordmark />
			</div>
		</header>
	);
}
