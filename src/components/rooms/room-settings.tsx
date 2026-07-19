import { Settings2 } from "lucide-react";
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

export function RoomSettings() {
	const settings = useSettings();
	const aiId = useId();
	const subId = useId();

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
					Messages with a tip get a small sparkle. Hover them to read it.
				</p>
				<div className="mt-4 space-y-4">
					<div className="flex items-center justify-between gap-4">
						<Label
							htmlFor={aiId}
							className="flex-1 flex-col items-start gap-0.5 font-normal"
						>
							<span className="text-sm">AI highlights</span>
							<span className="text-muted-foreground text-xs">
								Useful phrases from replies
							</span>
						</Label>
						<Switch
							id={aiId}
							checked={settings.aiHighlights}
							onCheckedChange={(v) => updateSettings({ aiHighlights: v })}
						/>
					</div>
					<div className="flex items-center justify-between gap-4">
						<Label
							htmlFor={subId}
							className="flex-1 flex-col items-start gap-0.5 font-normal"
						>
							<span className="text-sm">Submission highlights</span>
							<span className="text-muted-foreground text-xs">
								Feedback on messages you send
							</span>
						</Label>
						<Switch
							id={subId}
							checked={settings.submissionHighlights}
							onCheckedChange={(v) =>
								updateSettings({ submissionHighlights: v })
							}
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
