import { initials, platformTheme } from "@/lib/platform-theme";
import type { Persona, Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

const sizes = {
	xs: "size-5 text-[9px]",
	sm: "size-7 text-xs",
	md: "size-8 text-xs",
} as const;

/** Initials chip on the platform color for the conversation partner. */
export function PersonaAvatar({
	persona,
	platform,
	size = "md",
	className,
}: {
	persona: Persona;
	platform: Platform;
	size?: keyof typeof sizes;
	className?: string;
}) {
	return (
		<AvatarChip
			label={initials(persona.name)}
			className={cn(sizes[size], platformTheme[platform].avatar, className)}
		/>
	);
}

/** Neutral chip for the learner's own messages. */
export function UserAvatar({
	size = "md",
	className,
}: {
	size?: keyof typeof sizes;
	className?: string;
}) {
	return (
		<AvatarChip
			label="Y"
			className={cn(
				sizes[size],
				"bg-secondary text-secondary-foreground",
				className,
			)}
		/>
	);
}

function AvatarChip({
	label,
	className,
}: {
	label: string;
	className?: string;
}) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				"flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
				className,
			)}
		>
			{label}
		</span>
	);
}
