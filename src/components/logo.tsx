import { cn } from "@/lib/utils";

/**
 * Inklish mark: a speech bubble carrying a lowercase "i".
 * Bubble = conversation practice; yellow = the highlighter accent.
 */
export function InklishMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 48 48"
			aria-hidden="true"
			className={cn("size-7", className)}
		>
			<path
				fill="#FFD94A"
				d="M16 5h16c6.6 0 12 5.4 12 12v7c0 6.6-5.4 12-12 12H21.5l-8.9 6.9c-1.1.85-2.7-.1-2.5-1.5l.85-5.9C6.4 33.8 4 30.2 4 24v-7C4 10.4 9.4 5 16 5Z"
			/>
			<circle cx="24" cy="12" r="2.9" fill="#1A1A1A" />
			<path
				d="M24 19v9.25"
				fill="none"
				stroke="#1A1A1A"
				strokeWidth="4.5"
				strokeLinecap="round"
			/>
		</svg>
	);
}
