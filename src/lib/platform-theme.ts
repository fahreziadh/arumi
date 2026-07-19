import type { Platform } from "./types";

export interface PlatformTheme {
	/** Tinted icon tile used on home cards, lists, and headers. */
	tile: string;
	/** Avatar chip for the persona (initials on the platform color). */
	avatar: string;
	/** Chat rooms only: bubbles (WhatsApp-like) or flat workspace rows (Slack-like). */
	chatStyle: "bubble" | "flat";
	/** Background of the chat message area. */
	wall: string;
	/** Outgoing (user) bubble. */
	bubbleOut: string;
	bubbleOutMeta: string;
	/** Incoming (persona) bubble. */
	bubbleIn: string;
	bubbleInMeta: string;
	/** Header strip override (background + text) for rooms that aren't white. */
	header?: string;
	headerSub?: string;
	/** WhatsApp/Telegram-style bubble tails: fill colors for each side. */
	tailOut?: string;
	tailIn?: string;
	/**
	 * Where the tail sits: WhatsApp anchors it to the top of the first bubble
	 * in a group, Telegram to the bottom of the last one.
	 */
	tailPlacement?: "top" | "bottom";
	/** Show delivery checkmarks on outgoing messages. */
	checks?: string;
	/** Paper-plane send icon (Telegram/WhatsApp) instead of the arrow. */
	sendIcon?: "plane";
	/** Centered date pill above the first message, like the real apps. */
	dateChip?: string;
	/** Composer strip + input + send button overrides. */
	composerBar?: string;
	composerInput?: string;
	sendButton?: string;
	/** Flat style: base text, author name, and meta colors (dark rooms). */
	flatText?: string;
	flatName?: string;
	flatMeta?: string;
}

export const platformTheme: Record<Platform, PlatformTheme> = {
	email: {
		tile: "bg-[#EA4335]/10 text-[#EA4335]",
		avatar: "bg-[#0B57D0] text-white",
		chatStyle: "bubble",
		wall: "bg-background",
		bubbleOut: "bg-primary text-primary-foreground",
		bubbleOutMeta: "text-primary-foreground/60",
		bubbleIn: "bg-muted",
		bubbleInMeta: "text-muted-foreground",
	},
	slack: {
		tile: "bg-[#611F69]/10 text-[#611F69]",
		avatar: "bg-[#611F69] text-white rounded-lg",
		chatStyle: "flat",
		wall: "bg-background",
		bubbleOut: "bg-primary text-primary-foreground",
		bubbleOutMeta: "text-primary-foreground/60",
		bubbleIn: "bg-muted",
		bubbleInMeta: "text-muted-foreground",
		composerInput:
			"rounded-xl border-border bg-background focus-visible:border-foreground/30 focus-visible:bg-background",
		sendButton: "rounded-lg bg-[#007A5A] text-white hover:bg-[#007A5A]/90",
	},
	github: {
		tile: "bg-[#24292F]/10 text-[#24292F]",
		avatar: "bg-[#24292F] text-white",
		chatStyle: "bubble",
		wall: "bg-background",
		bubbleOut: "bg-primary text-primary-foreground",
		bubbleOutMeta: "text-primary-foreground/60",
		bubbleIn: "bg-muted",
		bubbleInMeta: "text-muted-foreground",
	},
	whatsapp: {
		tile: "bg-[#25D366]/10 text-[#1DAB55]",
		avatar: "bg-[#25D366] text-white",
		chatStyle: "bubble",
		wall: "wall-whatsapp",
		bubbleOut: "bg-[#D9FDD3] text-[#111B21]",
		bubbleOutMeta: "text-[#111B21]/45",
		bubbleIn: "bg-white text-[#111B21] shadow-sm",
		bubbleInMeta: "text-[#111B21]/45",
		tailOut: "text-[#D9FDD3]",
		tailIn: "text-white",
		checks: "text-[#53BDEB]",
		sendIcon: "plane",
		dateChip: "bg-white/90 text-[#54656F] shadow-sm",
		composerInput: "bg-white shadow-sm focus-visible:bg-white",
		sendButton: "bg-[#00A884] text-white shadow-sm hover:bg-[#00A884]/90",
	},
	telegram: {
		tile: "bg-[#26A5E4]/10 text-[#26A5E4]",
		avatar: "bg-[#26A5E4] text-white",
		chatStyle: "bubble",
		wall: "wall-telegram",
		bubbleOut: "bg-[#EFFDDE] text-[#111B21] shadow-sm",
		bubbleOutMeta: "text-[#4FAE4E]/80",
		bubbleIn: "bg-white text-[#111B21] shadow-sm",
		bubbleInMeta: "text-[#111B21]/45",
		tailOut: "text-[#EFFDDE]",
		tailIn: "text-white",
		tailPlacement: "bottom",
		checks: "text-[#4FAE4E]",
		sendIcon: "plane",
		dateChip: "bg-white/80 text-[#111B21]/55 shadow-sm",
		// Telegram floats the composer over the wall: a white message bubble
		// and a round send button, no bar behind them.
		composerInput:
			"rounded-2xl border-transparent bg-white shadow-sm focus-visible:bg-white",
		sendButton:
			"bg-white text-[#3390EC] shadow-sm hover:bg-[#3390EC] hover:text-white",
	},
	discord: {
		tile: "bg-[#5865F2]/10 text-[#5865F2]",
		avatar: "bg-[#5865F2] text-white",
		chatStyle: "flat",
		wall: "bg-[#313338]",
		bubbleOut: "bg-primary text-primary-foreground",
		bubbleOutMeta: "text-primary-foreground/60",
		bubbleIn: "bg-muted",
		bubbleInMeta: "text-muted-foreground",
		header: "bg-[#313338] text-white",
		headerSub: "text-[#B5BAC1]",
		composerBar: "bg-[#313338]",
		composerInput:
			"rounded-lg bg-[#383A40] text-[#DBDEE1] placeholder:text-[#87898C] focus-visible:bg-[#404249]",
		sendButton: "bg-[#5865F2] text-white hover:bg-[#5865F2]/90",
		flatText: "text-[#DBDEE1]",
		flatName: "text-[#F2F3F5]",
		flatMeta: "text-[#949BA4]",
	},
	teams: {
		tile: "bg-[#5B5FC7]/10 text-[#5B5FC7]",
		avatar: "bg-[#5B5FC7] text-white",
		chatStyle: "bubble",
		wall: "bg-[#F5F5F5]",
		bubbleOut: "bg-[#E8EBFA] text-[#242424]",
		bubbleOutMeta: "text-[#616161]",
		bubbleIn: "bg-white text-[#242424] shadow-sm",
		bubbleInMeta: "text-[#616161]",
		dateChip: "bg-white text-[#616161] shadow-sm",
		composerInput: "rounded-lg bg-white shadow-sm focus-visible:bg-white",
		sendButton: "bg-[#5B5FC7] text-white hover:bg-[#5B5FC7]/90",
	},
	linkedin: {
		tile: "bg-[#0A66C2]/10 text-[#0A66C2]",
		avatar: "bg-[#0A66C2] text-white",
		chatStyle: "flat",
		wall: "bg-background",
		bubbleOut: "bg-[#0A66C2] text-white",
		bubbleOutMeta: "text-white/70",
		bubbleIn: "bg-muted",
		bubbleInMeta: "text-muted-foreground",
		composerInput: "bg-[#EEF3F8] focus-visible:bg-[#E4EBF1]",
		sendButton: "bg-[#0A66C2] text-white hover:bg-[#0A66C2]/90",
	},
	support: {
		tile: "bg-[#0E7490]/10 text-[#0E7490]",
		avatar: "bg-[#0E7490] text-white",
		chatStyle: "bubble",
		wall: "bg-[#F2F4F7]",
		bubbleOut: "bg-[#0E7490] text-white",
		bubbleOutMeta: "text-white/70",
		bubbleIn: "bg-white text-foreground shadow-sm",
		bubbleInMeta: "text-muted-foreground",
		dateChip: "bg-white text-muted-foreground shadow-sm",
		composerInput: "bg-white shadow-sm focus-visible:bg-white",
		sendButton: "bg-[#0E7490] text-white hover:bg-[#0E7490]/90",
	},
	custom: {
		tile: "bg-muted text-foreground",
		avatar: "bg-primary text-primary-foreground",
		chatStyle: "bubble",
		wall: "bg-background",
		bubbleOut: "bg-primary text-primary-foreground",
		bubbleOutMeta: "text-primary-foreground/60",
		bubbleIn: "bg-muted",
		bubbleInMeta: "text-muted-foreground",
	},
};

export function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	const chars =
		parts.length > 1
			? `${parts[0][0]}${parts[parts.length - 1][0]}`
			: parts[0].slice(0, 1);
	return chars.toUpperCase();
}
