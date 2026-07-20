# Inklish

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
