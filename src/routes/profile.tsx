import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, MessageCircle, MoveRight, Sparkles } from "lucide-react";
import { AccountAvatar } from "@/components/account-avatar";
import { AppHeader } from "@/components/app-header";
import { RequireAuth } from "@/components/auth-gate";
import { KIND_DOT } from "@/components/coach/tip-card";
import { LoadingScreen } from "@/components/loading-screen";
import { PlatformTile } from "@/components/platform-tile";
import { TrendChart } from "@/components/profile/trend-chart";
import { Button } from "@/components/ui/button";
import type { CoachKind } from "@/lib/coach";
import type { Platform } from "@/lib/types";
import { useCases } from "@/lib/use-cases";
import { useDailyLimit } from "@/lib/use-daily-limit";
import { useProfile } from "@/lib/use-profile";
import { cn } from "@/lib/utils";
import type { TipCategory } from "../../convex/coachCategories";
import { CATEGORY_HINT, CATEGORY_LABEL } from "../../convex/coachCategories";

export const Route = createFileRoute("/profile")({
	component: ProfileRoute,
});

function ProfileRoute() {
	return (
		<RequireAuth>
			<Profile />
		</RequireAuth>
	);
}

const monthAndYear = new Intl.DateTimeFormat(undefined, {
	month: "long",
	year: "numeric",
});

function platformLabel(platform: string): string {
	return useCases.find((u) => u.platform === platform)?.label ?? platform;
}

function categoryLabel(category: string): string {
	return CATEGORY_LABEL[category as TipCategory] ?? category;
}

function Profile() {
	const profile = useProfile();
	const limit = useDailyLimit();

	if (profile === undefined) return <LoadingScreen />;
	if (profile === null) return null;

	const { writing, lifetime, streak, trend, skills, platforms, examples } =
		profile;

	return (
		<div className="min-h-dvh">
			<AppHeader />
			<main className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:px-6">
				<div className="flex items-center gap-4">
					<AccountAvatar image={profile.image} name={profile.name} size="lg" />
					<div className="min-w-0">
						<h1 className="truncate font-bold text-2xl tracking-tight">
							{profile.name}
						</h1>
						<p className="truncate text-muted-foreground text-sm">
							{profile.email ? `${profile.email} · ` : ""}
							Practicing since {monthAndYear.format(profile.joinedAt)}
						</p>
					</div>
				</div>

				{writing.score === null ? (
					<EmptyState />
				) : (
					<>
						<section aria-label="Writing score" className="mt-8">
							<div className="flex items-end justify-between gap-4">
								<div>
									<p className="font-medium text-muted-foreground text-sm">
										Writing score
									</p>
									<p className="font-bold text-5xl tabular-nums tracking-tight">
										{writing.score}
										<span className="ml-1.5 font-normal text-base text-muted-foreground tracking-normal">
											/ 100
										</span>
									</p>
								</div>
								<p className="max-w-[17rem] text-right text-muted-foreground text-sm">
									{writing.clean} of {writing.analyzed} marked{" "}
									{writing.analyzed === 1 ? "message" : "messages"} needed no
									fixes.
								</p>
							</div>
							<TrendChart weeks={trend} />
						</section>

						<section
							aria-label="Practice habit"
							className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
						>
							<Stat
								value={streak.current}
								label="Day streak"
								icon={
									streak.current > 0 ? (
										<Flame className="size-4 text-orange-500" />
									) : null
								}
							/>
							<Stat value={streak.activeDays} label="Days practiced" />
							<Stat value={lifetime.messagesSent} label="Messages written" />
							<Stat value={lifetime.conversations} label="Conversations" />
						</section>

						{limit && limit.limit > 0 && (
							<section aria-label="Today" className="mt-3">
								<div className="rounded-2xl bg-muted/50 px-4 py-3">
									<div className="flex items-baseline justify-between gap-3">
										<p className="font-medium text-sm">Today</p>
										<p className="text-muted-foreground text-sm tabular-nums">
											{limit.used} / {limit.limit} messages
										</p>
									</div>
									<Meter value={limit.used / limit.limit} className="mt-2" />
								</div>
							</section>
						)}

						{skills.length > 0 && (
							<section aria-label="Skill areas" className="mt-10">
								<h2 className="font-semibold text-lg tracking-tight">
									Where the marks land
								</h2>
								<p className="mt-1 text-muted-foreground text-sm">
									Every correction sorted by skill. The arrow compares the last
									two weeks with the two before them.
								</p>
								<ul className="mt-4 space-y-3">
									{skills.map((skill) => (
										<li key={skill.category}>
											<div className="flex items-baseline justify-between gap-3">
												<p className="font-medium text-sm">
													{categoryLabel(skill.category)}
												</p>
												<div className="flex items-baseline gap-2">
													<Change recent={skill.recent} prior={skill.prior} />
													<span className="text-muted-foreground text-sm tabular-nums">
														{skill.total}
													</span>
												</div>
											</div>
											<Meter
												value={skill.total / (skills[0]?.total || 1)}
												className="mt-1.5"
											/>
											<p className="mt-1 text-muted-foreground text-xs">
												{CATEGORY_HINT[skill.category as TipCategory] ?? ""}
											</p>
										</li>
									))}
								</ul>
							</section>
						)}

						{platforms.some((p) => p.score !== null) && (
							<section aria-label="Registers" className="mt-10">
								<h2 className="font-semibold text-lg tracking-tight">
									How you do in each room
								</h2>
								<p className="mt-1 text-muted-foreground text-sm">
									The same English reads differently in an email and a chat.
								</p>
								<ul className="mt-4 space-y-2">
									{platforms.map((row) => (
										<li key={row.platform} className="flex items-center gap-3">
											<PlatformTile
												platform={row.platform as Platform}
												size="sm"
											/>
											<span className="min-w-0 flex-1 truncate text-sm">
												{platformLabel(row.platform)}
											</span>
											<span className="text-muted-foreground text-xs tabular-nums">
												{row.conversations}{" "}
												{row.conversations === 1 ? "session" : "sessions"}
											</span>
											<span className="w-12 text-right font-semibold text-sm tabular-nums">
												{row.score ?? "—"}
											</span>
										</li>
									))}
								</ul>
							</section>
						)}

						{examples.length > 0 && (
							<section aria-label="Recent corrections" className="mt-10">
								<h2 className="font-semibold text-lg tracking-tight">
									Recent corrections
								</h2>
								<ul className="mt-4 space-y-2.5">
									{examples.map((item) => (
										<li
											key={`${item.title}:${item.quote}`}
											className="flex items-start gap-3 rounded-2xl bg-muted/50 px-4 py-3"
										>
											<span
												className={cn(
													"mt-1.5 size-1.5 shrink-0 rounded-full",
													KIND_DOT[item.kind as CoachKind],
												)}
												aria-hidden="true"
											/>
											<div className="min-w-0 flex-1">
												<p className="font-medium text-sm">{item.title}</p>
												{item.correction && (
													<p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
														<s className="break-words text-muted-foreground/70">
															{item.quote}
														</s>
														<MoveRight
															className="size-3 shrink-0 text-muted-foreground/50"
															aria-hidden="true"
														/>
														<span className="break-words font-medium text-green-700">
															{item.correction}
														</span>
													</p>
												)}
												<p className="mt-1 text-pretty text-muted-foreground text-sm leading-relaxed">
													{item.detail}
												</p>
											</div>
										</li>
									))}
								</ul>
							</section>
						)}
					</>
				)}

				<div className="mt-10">
					<Button nativeButton={false} render={<Link to="/" />}>
						<MessageCircle />
						Start a conversation
						<MoveRight />
					</Button>
				</div>
			</main>
		</div>
	);
}

function Meter({ value, className }: { value: number; className?: string }) {
	return (
		<div
			className={cn(
				"h-1.5 overflow-hidden rounded-full bg-foreground/10",
				className,
			)}
			aria-hidden="true"
		>
			<div
				className="h-full rounded-full bg-foreground/40 transition-[width] duration-500"
				style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
			/>
		</div>
	);
}

/** Fewer marks is improvement, so a drop is the good direction. */
function Change({ recent, prior }: { recent: number; prior: number }) {
	if (prior === 0 && recent === 0) return null;
	const delta = recent - prior;
	if (delta === 0) return null;
	const better = delta < 0;
	return (
		<span
			className={cn(
				"font-medium text-xs tabular-nums",
				better ? "text-green-700" : "text-muted-foreground",
			)}
		>
			{better ? "↓" : "↑"}
			{Math.abs(delta)}
		</span>
	);
}

function Stat({
	value,
	label,
	icon,
}: {
	value: number | string;
	label: string;
	icon?: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl bg-muted/50 px-4 py-3">
			<p className="flex items-center gap-1.5 font-bold text-2xl tabular-nums tracking-tight">
				{icon}
				{value}
			</p>
			<p className="mt-0.5 text-muted-foreground text-xs">{label}</p>
		</div>
	);
}

function EmptyState() {
	return (
		<div className="mt-10 rounded-2xl bg-muted/50 p-8 text-center">
			<Sparkles
				className="mx-auto size-5 text-muted-foreground"
				aria-hidden="true"
			/>
			<p className="mt-3 font-medium">No stats yet.</p>
			<p className="mx-auto mt-1 max-w-sm text-pretty text-muted-foreground text-sm">
				Have a conversation and the coach will start marking your messages. Your
				score, streak, and the skills worth practicing show up here.
			</p>
		</div>
	);
}
