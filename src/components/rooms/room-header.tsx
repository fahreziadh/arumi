import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RoomSettings } from "./room-settings";

export function RoomHeader({
	title,
	subtitle,
	avatar,
	className,
	subtitleClassName,
}: {
	title: string;
	subtitle: string;
	avatar?: ReactNode;
	className?: string;
	subtitleClassName?: string;
}) {
	return (
		<header className={cn("vt-room-header shrink-0 bg-background", className)}>
			<div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-2 sm:px-4">
				<Button
					variant="ghost"
					size="icon"
					aria-label="Back to home"
					nativeButton={false}
					render={<Link to="/" />}
				>
					<ArrowLeft />
				</Button>
				{avatar}
				<div className="min-w-0">
					<p className="truncate font-medium text-sm leading-tight">{title}</p>
					<p
						className={cn(
							"truncate text-muted-foreground text-xs",
							subtitleClassName,
						)}
						aria-live="polite"
					>
						{subtitle}
					</p>
				</div>
				<RoomSettings />
			</div>
		</header>
	);
}
