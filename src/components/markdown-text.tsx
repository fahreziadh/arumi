import type { ComponentProps } from "react";
import Markdown from "react-markdown";

const components: ComponentProps<typeof Markdown>["components"] = {
	p: (props) => <p className="mb-2.5 last:mb-0" {...props} />,
	strong: (props) => <strong className="font-semibold" {...props} />,
	ul: (props) => <ul className="mb-2.5 list-disc space-y-1 pl-5" {...props} />,
	ol: (props) => (
		<ol className="mb-2.5 list-decimal space-y-1 pl-5" {...props} />
	),
	h1: (props) => <p className="mb-2 font-semibold" {...props} />,
	h2: (props) => <p className="mb-2 font-semibold" {...props} />,
	h3: (props) => <p className="mb-2 font-semibold" {...props} />,
	a: (props) => (
		<a
			className="underline underline-offset-2"
			target="_blank"
			rel="noreferrer"
			{...props}
		/>
	),
	code: (props) => (
		<code className="rounded bg-muted px-1 py-0.5 text-[0.9em]" {...props} />
	),
	pre: (props) => (
		<pre
			className="mb-2.5 overflow-x-auto rounded-lg bg-muted p-3 text-xs"
			{...props}
		/>
	),
	blockquote: (props) => (
		<blockquote
			className="mb-2.5 border-border border-l-2 pl-3 text-muted-foreground"
			{...props}
		/>
	),
	hr: () => <hr className="my-3 border-border/60" />,
};

export function MarkdownText({ text }: { text: string }) {
	return <Markdown components={components}>{text}</Markdown>;
}
