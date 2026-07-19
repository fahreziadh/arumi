import { useAuthActions } from "@convex-dev/auth/react";
import {
	Authenticated,
	AuthLoading,
	Unauthenticated,
} from "convex/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { siGoogle } from "simple-icons";
import { ArumiMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

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
			<svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-current">
				<path d={siGoogle.path} />
			</svg>
			Continue with Google
		</Button>
	);
}

export function SignInScreen() {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
			<ArumiMark className="size-12" />
			<div>
				<h1 className="text-balance font-bold text-3xl tracking-tight">
					Practice English{" "}
					<span className="-mx-1 rounded-sm bg-[#FFE55A]/70 px-1 [box-decoration-break:clone]">
						where you write it
					</span>
				</h1>
				<p className="mx-auto mt-3 max-w-sm text-pretty text-muted-foreground">
					Low-stakes reps in the real formats, with a coach that marks your
					messages like a person would. Sign in to start practicing.
				</p>
			</div>
			<GoogleSignInButton />
		</div>
	);
}

export function RequireAuth({ children }: { children: ReactNode }) {
	return (
		<>
			<AuthLoading>
				<div className="h-dvh" />
			</AuthLoading>
			<Unauthenticated>
				<SignInScreen />
			</Unauthenticated>
			<Authenticated>{children}</Authenticated>
		</>
	);
}
