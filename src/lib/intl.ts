const time = new Intl.DateTimeFormat(undefined, {
	hour: "2-digit",
	minute: "2-digit",
});

const dateTime = new Intl.DateTimeFormat(undefined, {
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

export function formatTime(at: number) {
	return time.format(at);
}

export function formatDateTime(at: number) {
	return dateTime.format(at);
}

const date = new Intl.DateTimeFormat(undefined, {
	month: "long",
	day: "numeric",
});

export function formatDate(at: number) {
	return date.format(at);
}
