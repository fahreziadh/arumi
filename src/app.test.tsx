// @vitest-environment jsdom
import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, it } from "vitest";
import { clearAllConversations, createConversation } from "@/lib/store";
import { routeTree } from "./routeTree.gen";

// jsdom is missing a few browser APIs the UI relies on.
beforeAll(() => {
	window.matchMedia ??= ((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
	})) as typeof window.matchMedia;
	window.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	Element.prototype.scrollTo ??= () => {};
	Element.prototype.getAnimations ??= () => [];
	Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
	cleanup();
	clearAllConversations();
	localStorage.clear();
});

function renderApp(initialPath = "/") {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
	render(<RouterProvider router={router} />);
	return router;
}

it("shows the communication use cases on home", async () => {
	renderApp();
	expect(await screen.findByText("Email Threads")).toBeTruthy();
	expect(screen.getByText("Slack Discussion")).toBeTruthy();
	expect(screen.getByText("GitHub Issues")).toBeTruthy();
	expect(screen.getByText("Something Else")).toBeTruthy();
});

it("walks the full flow: prepare, confirm, chat in a session room", async () => {
	renderApp();
	fireEvent.click(
		await screen.findByRole("link", { name: /Slack Discussion/ }),
	);

	// Preparation asks for the topic.
	expect(
		await screen.findByText("What do you want to talk about?"),
	).toBeTruthy();
	fireEvent.change(screen.getByLabelText("Your answer"), {
		target: { value: "I want to plan the next release with my team" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Send answer" }));

	// Confirmation shows the format and topic, then starts the session.
	expect(
		await screen.findByRole("button", { name: "Start session" }),
	).toBeTruthy();
	expect(
		screen.getAllByText("I want to plan the next release with my team").length,
	).toBeGreaterThan(0);
	fireEvent.click(screen.getByRole("button", { name: "Start session" }));

	// Chat room with the platform persona and a topic-based opener.
	expect((await screen.findAllByText("Alex Chen")).length).toBeGreaterThan(0);
	expect(
		screen.getByText(/Saw your message about i want to plan/i),
	).toBeTruthy();

	fireEvent.change(screen.getByLabelText("Your message"), {
		target: { value: "Can we ship on Friday?" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Send message" }));
	expect(await screen.findByText("Can we ship on Friday?")).toBeTruthy();
	expect(
		await screen.findByText(/Good question/, {}, { timeout: 4000 }),
	).toBeTruthy();
});

it("asks a follow-up in preparation when the answer is unclear", async () => {
	renderApp();
	fireEvent.click(await screen.findByRole("link", { name: /WhatsApp Chat/ }));
	fireEvent.change(await screen.findByLabelText("Your answer"), {
		target: { value: "idk" },
	});
	fireEvent.click(screen.getByRole("button", { name: "Send answer" }));
	expect(await screen.findByText(/Can you say a bit more/)).toBeTruthy();
	expect(screen.queryByRole("button", { name: "Start session" })).toBeNull();
});

it("lists existing conversations on home and opens their room", async () => {
	const id = createConversation({
		platform: "email",
		platformLabel: "Email Threads",
		topic: "Asking for a project deadline extension",
	});
	renderApp();
	fireEvent.click(
		await screen.findByText("Asking for a project deadline extension"),
	);
	// Email room: subject, sender and reply composer.
	expect((await screen.findAllByText("Sarah Lin")).length).toBeGreaterThan(0);
	expect(screen.getByLabelText("Your reply")).toBeTruthy();
	expect(id).toBeTruthy();
});

it("renders a GitHub issue thread for github conversations", async () => {
	const id = createConversation({
		platform: "github",
		platformLabel: "GitHub Issues",
		topic: "Bug report about broken pagination",
	});
	renderApp(`/session/${id}`);
	expect(await screen.findByText("Open")).toBeTruthy();
	expect(screen.getByText(/you opened this issue/)).toBeTruthy();
	expect(screen.getByLabelText("Your comment")).toBeTruthy();
});

it("shows a friendly fallback for unknown sessions", async () => {
	renderApp("/session/does-not-exist");
	expect(
		await screen.findByText(/couldn't find that conversation/i),
	).toBeTruthy();
});
