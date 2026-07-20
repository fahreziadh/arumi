import { InklishMark } from "@/components/logo";

/** Full-screen centered mark, matching the boot splash in index.html. */
export function LoadingScreen() {
	return (
		<div className="flex h-dvh animate-in items-center justify-center fade-in duration-300">
			<InklishMark className="size-20 sm:size-28" />
		</div>
	);
}
