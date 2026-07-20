# Contributing to Inklish

Thanks for helping out. This is a small project; the process is deliberately light.

## Setup

Follow "Running it yourself" in the [README](README.md). You need two terminals: `bunx convex dev` for the backend and `bun run dev` for the app.

## Before you open a PR

```bash
bun run check      # Biome lint + format
bunx tsc --noEmit  # types
bun run test       # Vitest
```

All three should pass clean. Small, focused PRs land fastest; if you want to change something big, open an issue first so we can talk it through.

## Conventions

- **Backend:** read `convex/_generated/ai/guidelines.md` before touching Convex code. It overrides anything you think you know about Convex.
- **Comments:** near zero. Write one only for a constraint the code cannot express. No docblocks, no narration.
- **Copy:** sentence case, plain words, no em dashes. Use `.` `,` `:` `;` instead.
- **UI:** rooms imitate their real platforms (email reads like email, chat like chat). Keep the borderless, low-chrome look of the rest of the app.

## Reporting bugs

Open an issue with what you did, what you expected, and what happened instead. A screenshot helps a lot for room or coach UI problems.
