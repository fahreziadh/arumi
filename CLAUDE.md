# Inklish

## Let the code explain itself

Write code a reader understands without a comment. When you feel the urge to
write one, that is a signal the code is not clear enough yet — fix the code
instead:

- Name the thing. `if (sendsOnEnter(event))` beats `// Enter sends`.
- Extract a named function or constant instead of captioning a block.
- Make the shape obvious. If a value needs a comment to explain its units,
  scope, or origin, put that in its name (`historyDayKey`, `minDraftChars`).

Never write a comment that:

- restates what the next line does
- explains why your change is correct, or narrates the edit
- labels a section that a well-named function would have labelled

A comment earns its place only when it carries what code cannot: an external
constraint, a non-obvious invariant, a deliberate tradeoff, or a trap that
would otherwise be re-introduced. Prefer a short doc comment on an exported
symbol over inline commentary inside a body. Fewer, load-bearing comments —
not a running narration.

## Never run any program

Do not launch or execute programs in this repo. That includes:

- dev servers and watchers (`bun run dev`, `bunx convex dev`, `vite`)
- preview servers (`bun run preview`)
- background or long-running processes of any kind
- one-shot runs of the app or backend (`convex dev --once`, scripts that start services)

If something needs to be run (a server, a login, a deploy), ask Fahrezi to run it himself and tell him the exact command. He can run it in-session with the `!` prefix so the output lands in the conversation.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
