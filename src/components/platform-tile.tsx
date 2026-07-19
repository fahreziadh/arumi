import { PlatformIcon } from "@/components/platform-icon";
import { platformTheme } from "@/lib/platform-theme";
import type { Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

const sizes = {
	sm: { tile: "size-7 rounded-md", icon: "size-4" },
	md: { tile: "size-9 rounded-lg", icon: "size-4" },
	lg: { tile: "size-10 rounded-xl", icon: "size-[18px]" },
} as const;

/**
 * Tinted platform icon tile. `morph` gives it a `view-transition-name` so the
 * tile travels between pages (home card → prepare header).
 */
export function PlatformTile({
	platform,
	size = "md",
	morph = false,
	className,
}: {
	platform: Platform;
	size?: keyof typeof sizes;
	morph?: boolean;
	className?: string;
}) {
	return (
		<span
			style={morph ? { viewTransitionName: `tile-${platform}` } : undefined}
			className={cn(
				"flex shrink-0 items-center justify-center",
				sizes[size].tile,
				platformTheme[platform].tile,
				className,
			)}
		>
			<PlatformIcon platform={platform} className={sizes[size].icon} />
		</span>
	);
}
