import { ArrowUp, SendHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { LimitNotice } from "@/components/rooms/limit-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlatformTheme } from "@/lib/platform-theme";
import { useDailyLimit } from "@/lib/use-daily-limit";
import { cn } from "@/lib/utils";

export function ChatComposer({
	personaName,
	theme,
	onSend,
}: {
	personaName: string;
	theme: PlatformTheme;
	onSend: (text: string) => void;
}) {
	const [draft, setDraft] = useState("");
	const limit = useDailyLimit();

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = draft.trim();
		if (!text) return;
		setDraft("");
		onSend(text);
	};

	if (limit?.limited) {
		return (
			<div className={cn("shrink-0", theme.composerBar)}>
				<div className="mx-auto w-full max-w-2xl px-4 py-3 sm:px-6">
					<LimitNotice limit={limit.limit} resetAt={limit.resetAt} />
				</div>
			</div>
		);
	}

	return (
		<div className={cn("shrink-0", theme.composerBar)}>
			<form
				onSubmit={submit}
				className="vt-composer mx-auto w-full max-w-2xl px-4 py-3 sm:px-6"
				aria-label="Send a message"
			>
				<div className="flex items-center gap-2">
					<Input
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						placeholder={`Message ${personaName}…`}
						aria-label="Your message"
						autoComplete="off"
						autoFocus
						className={cn("h-11 rounded-full px-4", theme.composerInput)}
					/>
					<Button
						type="submit"
						size="icon-xl"
						aria-label="Send message"
						disabled={!draft.trim()}
						className={theme.sendButton}
					>
						{theme.sendIcon === "plane" ? <SendHorizontal /> : <ArrowUp />}
					</Button>
				</div>
			</form>
		</div>
	);
}

export function TextareaComposer({
	value,
	onValueChange,
	onSubmit,
	formLabel,
	inputLabel,
	placeholder,
	rows = 3,
	autoFocus = false,
	hint,
	header,
	footerEnd,
	submitChildren,
	textareaClassName,
	className,
}: {
	value: string;
	onValueChange: (value: string) => void;
	onSubmit: () => void;
	formLabel: string;
	inputLabel: string;
	placeholder: string;
	rows?: number;
	autoFocus?: boolean;
	hint: string;
	header?: ReactNode;
	footerEnd?: ReactNode;
	submitChildren: ReactNode;
	textareaClassName?: string;
	className?: string;
}) {
	const limit = useDailyLimit();

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!value.trim()) return;
		onSubmit();
	};

	if (limit?.limited) {
		return (
			<div className={className}>
				<LimitNotice limit={limit.limit} resetAt={limit.resetAt} />
			</div>
		);
	}

	return (
		<form onSubmit={submit} aria-label={formLabel} className={className}>
			{header}
			<Textarea
				value={value}
				onChange={(e) => onValueChange(e.target.value)}
				onKeyDown={(e) => {
					if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
						e.currentTarget.form?.requestSubmit();
					}
				}}
				placeholder={placeholder}
				aria-label={inputLabel}
				rows={rows}
				autoFocus={autoFocus}
				className={textareaClassName}
			/>
			<div className="mt-2 flex items-center gap-3">
				<Button type="submit" disabled={!value.trim()}>
					{submitChildren}
				</Button>
				<p className="text-muted-foreground text-xs">{hint}</p>
				{footerEnd}
			</div>
		</form>
	);
}
