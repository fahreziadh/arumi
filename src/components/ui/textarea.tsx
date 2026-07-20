import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Exported so an overlay can be laid over a textarea with identical metrics:
 * anything that moves a glyph (padding, border, font size) must match or the
 * two layers drift apart.
 */
export const textareaBaseClass =
	"flex field-sizing-content min-h-16 w-full resize-none rounded-2xl border border-transparent bg-muted/60 px-3 py-3 text-base shadow-none transition-colors outline-none placeholder:text-muted-foreground focus-visible:bg-muted disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(textareaBaseClass, className)}
			{...props}
		/>
	);
}

export { Textarea };
