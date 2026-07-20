import { UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
	sm: "size-8",
	md: "size-9",
	lg: "size-14",
} as const;

/** Falls back to a neutral icon, never initials: a lettered chip reads like one of the personas. */
export function AccountAvatar({
	image,
	name,
	size = "md",
	className,
}: {
	image?: string | null;
	name?: string | null;
	size?: keyof typeof SIZE_CLASS;
	className?: string;
}) {
	if (image) {
		return (
			<img
				src={image}
				alt=""
				referrerPolicy="no-referrer"
				className={cn(
					"shrink-0 rounded-full object-cover",
					SIZE_CLASS[size],
					className,
				)}
			/>
		);
	}
	return (
		<span
			aria-hidden="true"
			title={name ?? undefined}
			className={cn(
				"flex shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground",
				SIZE_CLASS[size],
				className,
			)}
		>
			<UserRound className={size === "lg" ? "size-6" : "size-4"} />
		</span>
	);
}
