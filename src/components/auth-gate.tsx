import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { siGoogle } from "simple-icons";
import { CoachShowcase } from "@/components/coach-showcase";
import { LoadingScreen } from "@/components/loading-screen";
import { InklishMark } from "@/components/logo";
import { PlatformTile } from "@/components/platform-tile";
import { Button } from "@/components/ui/button";
import { useCases } from "@/lib/use-cases";

export function GoogleSignInButton() {
	const { signIn } = useAuthActions();
	const [busy, setBusy] = useState(false);

	return (
		<Button
			size="lg"
			disabled={busy}
			onClick={() => {
				setBusy(true);
				void signIn("google").finally(() => setBusy(false));
			}}
		>
			<svg
				viewBox="0 0 24 24"
				aria-hidden="true"
				className="size-4 fill-current"
			>
				<path d={siGoogle.path} />
			</svg>
			Continue with Google
		</Button>
	);
}

export function SignInScreen() {
	return (
		<div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-7 px-6 pt-9 pb-10 md:flex-row md:items-center md:justify-center md:gap-10 md:pt-12 lg:gap-14">
			<div className="mx-auto max-w-md text-center md:mx-0 md:flex-1 md:text-left">
				<InklishMark className="mx-auto size-9 md:mx-0" />
				<h1 className="mt-4 text-balance font-bold text-3xl tracking-tight sm:text-4xl">
					Practice English{" "}
					<span className="-mx-1 rounded-sm bg-[#FFE55A]/70 px-1 [box-decoration-break:clone]">
						where you write it
					</span>
				</h1>
				<p className="mt-3 text-pretty text-muted-foreground">
					Low-stakes reps in the real formats, with a coach that marks your
					messages like a person would.
				</p>
				<div className="mt-5 flex justify-center md:justify-start">
					<GoogleSignInButton />
				</div>
				<PlatformStrip />
			</div>
			<div className="mx-auto flex w-full max-w-md justify-center md:mx-0 md:flex-1">
				<CoachShowcase />
			</div>
		</div>
	);
}

const previewCount = 6;

function PlatformStrip() {
	return (
		<div className="mt-5 flex items-center justify-center gap-2 md:mt-8 md:justify-start">
			{useCases.slice(0, previewCount).map((u) => (
				<PlatformTile key={u.platform} platform={u.platform} size="sm" />
			))}
			<span className="text-muted-foreground text-sm">
				+{useCases.length - previewCount} more
			</span>
		</div>
	);
}

export function RequireAuth({ children }: { children: ReactNode }) {
	return (
		<>
			<AuthLoading>
				<LoadingScreen />
			</AuthLoading>
			<Unauthenticated>
				<SignInScreen />
			</Unauthenticated>
			<Authenticated>{children}</Authenticated>
		</>
	);
}
