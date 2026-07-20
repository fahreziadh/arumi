import { useEffect, useState } from "react";

const query = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion() {
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		const media = window.matchMedia(query);
		setReduced(media.matches);
		const onChange = () => setReduced(media.matches);
		media.addEventListener("change", onChange);
		return () => media.removeEventListener("change", onChange);
	}, []);

	return reduced;
}
