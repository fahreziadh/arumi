import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function NotFoundState({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
			<p className="font-medium">{title}</p>
			{description && (
				<p className="text-muted-foreground text-sm">{description}</p>
			)}
			<Button nativeButton={false} render={<Link to="/" />}>
				Back to home
			</Button>
		</div>
	);
}
