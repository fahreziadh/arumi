import { Link, useParams } from "@tanstack/react-router";
import { Flag, Settings2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { updateSettings, useSettings } from "@/lib/settings";

function CoachSwitch({
	label,
	description,
	checked,
	onCheckedChange,
}: {
	label: string;
	description: string;
	checked: boolean;
	onCheckedChange: (value: boolean) => void;
}) {
	const id = useId();
	return (
		<div className="flex items-center justify-between gap-4">
			<Label
				htmlFor={id}
				className="flex-1 flex-col items-start gap-0.5 font-normal"
			>
				<span className="text-sm">{label}</span>
				<span className="text-muted-foreground text-xs">{description}</span>
			</Label>
			<Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
		</div>
	);
}

export function RoomSettings() {
	const settings = useSettings();
	const { sessionId } = useParams({ strict: false });

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label="Session settings"
						className="ml-auto"
					/>
				}
			>
				<Settings2 />
			</PopoverTrigger>
			<PopoverContent align="end" className="w-72">
				<p className="font-medium text-sm">Coach</p>
				<p className="mt-0.5 text-muted-foreground text-xs">
					The coach marks messages the way a person would: an underline for
					something to fix, a highlight for a phrase worth keeping. Hover a
					mark to read it.
				</p>
				<div className="mt-4 space-y-4">
					<CoachSwitch
						label="AI highlights"
						description="Useful phrases from replies"
						checked={settings.aiHighlights}
						onCheckedChange={(v) => updateSettings({ aiHighlights: v })}
					/>
					<CoachSwitch
						label="Submission highlights"
						description="Feedback on messages you send"
						checked={settings.submissionHighlights}
						onCheckedChange={(v) => updateSettings({ submissionHighlights: v })}
					/>
				</div>
				{sessionId && (
					<Button
						variant="secondary"
						className="mt-5 w-full"
						nativeButton={false}
						render={<Link to="/report/$sessionId" params={{ sessionId }} />}
					>
						<Flag />
						Wrap up & see report
					</Button>
				)}
			</PopoverContent>
		</Popover>
	);
}
