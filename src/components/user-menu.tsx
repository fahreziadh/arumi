import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { LogOut, Settings2, UserRound } from "lucide-react";
import { useState } from "react";
import { AccountAvatar } from "@/components/account-avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/lib/use-profile";
import { api } from "../../convex/_generated/api";

export function UserMenu({ isAdmin }: { isAdmin?: boolean }) {
	const [open, setOpen] = useState(false);
	const { signOut } = useAuthActions();
	const identity = useQuery(api.profile.identity);
	const profile = useProfile(open);

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger
				aria-label="Your account"
				className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				<AccountAvatar image={identity?.image} name={identity?.name} />
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" sideOffset={8} className="w-76 p-2">
				<div className="flex items-center gap-3 px-2 py-1.5">
					<AccountAvatar image={identity?.image} name={identity?.name} />
					<div className="min-w-0">
						<p className="truncate font-medium text-sm">
							{identity?.name ?? "You"}
						</p>
						{identity?.email && (
							<p className="truncate text-muted-foreground text-xs">
								{identity.email}
							</p>
						)}
					</div>
				</div>

				<div className="mt-2 rounded-xl bg-muted/60 p-3">
					{profile === undefined ? (
						<StatsSkeleton />
					) : (
						<WritingScoreSummary profile={profile} />
					)}
				</div>

				<DropdownMenuSeparator className="my-2" />

				<DropdownMenuItem render={<Link to="/profile" />}>
					<UserRound />
					Profile & stats
				</DropdownMenuItem>
				{isAdmin && (
					<DropdownMenuItem render={<Link to="/admin" />}>
						<Settings2 />
						Admin
					</DropdownMenuItem>
				)}
				<DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
					<LogOut />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type Profile = NonNullable<ReturnType<typeof useProfile>>;

function WritingScoreSummary({ profile }: { profile: Profile | null }) {
	const score = profile?.writing.score ?? null;
	if (profile === null || score === null) {
		return (
			<p className="text-muted-foreground text-xs leading-relaxed">
				No writing marked yet. Finish a conversation and your score shows up
				here.
			</p>
		);
	}

	const { writing, streak } = profile;
	return (
		<>
			<p className="font-medium text-muted-foreground text-xs">Writing score</p>
			<p className="mt-1 font-bold text-3xl tabular-nums leading-none tracking-tight">
				{score}
				<span className="ml-1 font-normal text-muted-foreground text-sm tracking-normal">
					/ 100
				</span>
			</p>
			<div
				className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/10"
				aria-hidden="true"
			>
				<div
					className="h-full rounded-full bg-foreground/40"
					style={{ width: `${score}%` }}
				/>
			</div>
			<p className="mt-2.5 text-muted-foreground text-xs leading-relaxed">
				{writing.clean} of {writing.analyzed} marked{" "}
				{writing.analyzed === 1 ? "message" : "messages"} needed no fixes
				{streak.current > 0 ? ` · ${streak.current}-day streak` : ""}.
			</p>
		</>
	);
}

function StatsSkeleton() {
	return (
		<div>
			<Skeleton className="h-3 w-20" />
			<Skeleton className="mt-2 h-7 w-24" />
			<Skeleton className="mt-3 h-1 w-full" />
			<Skeleton className="mt-3 h-3 w-44" />
		</div>
	);
}
