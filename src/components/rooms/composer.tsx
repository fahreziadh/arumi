import { ArrowUp, SendHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { CoachedTextarea } from "@/components/coach/marked-field";
import { LimitNotice } from "@/components/rooms/limit-notice";
import { Button } from "@/components/ui/button";
import type { PlatformTheme } from "@/lib/platform-theme";
import { useDailyLimit } from "@/lib/use-daily-limit";
import { useDraftCoach } from "@/lib/use-draft-coach";
import { cn } from "@/lib/utils";

/** Grows with its content up to a cap, then scrolls. */
const CAPPED_GROWING_FIELD_CLASS = "max-h-40 min-h-11 rounded-3xl px-4 py-2.5";

function isSendKey(event: React.KeyboardEvent) {
	return event.key === "Enter" && !event.shiftKey;
}

function isModifierSendKey(event: React.KeyboardEvent) {
	return (event.metaKey || event.ctrlKey) && event.key === "Enter";
}

export interface SendOptions {
	/** The text is the coach's own rewrite, adopted unchanged. */
	fromCoachRewrite: boolean;
}

/**
 * Tracks whether what is about to be sent is still the coach's wording. Any
 * edit after adopting it makes the message the learner's own again.
 */
function useAdoptedRewrite(apply: (text: string) => void) {
	const [adopted, setAdopted] = useState<string | null>(null);
	return {
		adopted,
		adopt: (text: string) => {
			setAdopted(text.trim());
			apply(text);
		},
		release: () => setAdopted(null),
		sendOptions: (text: string): SendOptions => ({
			fromCoachRewrite: adopted !== null && adopted === text.trim(),
		}),
	};
}

export function ChatComposer({
	conversationId,
	personaName,
	theme,
	onSend,
}: {
	conversationId: string;
	personaName: string;
	theme: PlatformTheme;
	onSend: (text: string, options: SendOptions) => void;
}) {
	const [draft, setDraft] = useState("");
	const limit = useDailyLimit();
	const rewrite = useAdoptedRewrite(setDraft);
	const coach = useDraftCoach(conversationId, draft, rewrite.adopted);

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		const text = draft.trim();
		if (!text) return;
		const options = rewrite.sendOptions(text);
		setDraft("");
		rewrite.release();
		onSend(text, options);
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
				<div className="flex items-end gap-2">
					<CoachedTextarea
						coach={coach}
						onApplyRewrite={rewrite.adopt}
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (isSendKey(e)) {
								e.preventDefault();
								e.currentTarget.form?.requestSubmit();
							}
						}}
						rows={1}
						placeholder={`Message ${personaName}…`}
						aria-label="Your message"
						autoComplete="off"
						autoFocus
						className={cn(CAPPED_GROWING_FIELD_CLASS, theme.composerInput)}
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
	conversationId,
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
	conversationId: string;
	value: string;
	onValueChange: (value: string) => void;
	onSubmit: (options: SendOptions) => void;
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
	const rewrite = useAdoptedRewrite(onValueChange);
	const coach = useDraftCoach(conversationId, value, rewrite.adopted);

	const submit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!value.trim()) return;
		const options = rewrite.sendOptions(value);
		rewrite.release();
		onSubmit(options);
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
			<CoachedTextarea
				coach={coach}
				onApplyRewrite={rewrite.adopt}
				value={value}
				onChange={(e) => onValueChange(e.target.value)}
				onKeyDown={(e) => {
					if (isModifierSendKey(e)) {
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
