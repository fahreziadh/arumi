import { useEffect, useRef } from "react";

/**
 * Keeps a scrollable container pinned to its bottom as content grows:
 * instantly on first render, smoothly afterwards, and never while the
 * user has scrolled up to read history.
 */
export function useAutoScroll<T extends HTMLElement>(dep: unknown) {
	const ref = useRef<T>(null);
	const stick = useRef(true);
	const animating = useRef(false);
	const first = useRef(true);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const onScroll = () => {
			const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
			if (animating.current) {
				// Ignore intermediate positions of our own smooth scroll.
				if (distance < 4) animating.current = false;
				return;
			}
			stick.current = distance < 80;
		};
		// Real user input takes over immediately, even mid-animation.
		const onUserScroll = () => {
			animating.current = false;
			onScroll();
		};
		el.addEventListener("scroll", onScroll, { passive: true });
		el.addEventListener("wheel", onUserScroll, { passive: true });
		el.addEventListener("touchstart", onUserScroll, { passive: true });
		return () => {
			el.removeEventListener("scroll", onScroll);
			el.removeEventListener("wheel", onUserScroll);
			el.removeEventListener("touchstart", onUserScroll);
		};
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: dep re-triggers the pin on new content
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (first.current) {
			first.current = false;
			el.scrollTop = el.scrollHeight;
			return;
		}
		if (!stick.current) return;
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		if (reduce) {
			el.scrollTop = el.scrollHeight;
			return;
		}
		animating.current = true;
		el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
	}, [dep]);

	return ref;
}
