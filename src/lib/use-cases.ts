import type { Platform, RoomKind, UseCase } from "./types";

export const useCases: UseCase[] = [
	{
		platform: "email",
		label: "Email Threads",
		hint: "Greetings, sign-offs, and following up",
	},
	{
		platform: "slack",
		label: "Slack Discussion",
		hint: "Fast, casual threads with teammates",
	},
	{
		platform: "github",
		label: "GitHub Issues",
		hint: "Bug reports and technical writing",
	},
	{
		platform: "whatsapp",
		label: "WhatsApp Chat",
		hint: "Everyday small talk with a friend",
	},
	{
		platform: "telegram",
		label: "Telegram Chat",
		hint: "Short, quick, and to the point",
	},
	{
		platform: "discord",
		label: "Discord Conversation",
		hint: "Hanging out in a community server",
	},
	{
		platform: "teams",
		label: "Microsoft Teams Chat",
		hint: "Workplace updates and check-ins",
	},
	{
		platform: "linkedin",
		label: "LinkedIn Messages",
		hint: "Recruiters and professional networking",
	},
	{
		platform: "support",
		label: "Customer Support Chat",
		hint: "Explaining a problem, asking for help",
	},
	{
		platform: "custom",
		label: "Something Else",
		hint: "Describe your own scenario",
	},
];

export function getUseCase(platform: string): UseCase | undefined {
	return useCases.find((u) => u.platform === platform);
}

export function roomKind(platform: Platform): RoomKind {
	if (platform === "email") return "email";
	if (platform === "github") return "issue";
	return "chat";
}
