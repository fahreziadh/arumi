<p align="center">
  <img src=".github/home.png" alt="Inklish home screen: pick a format to practice in" width="900" />
</p>

# Inklish

Practice English where you write it. Inklish gives you low-stakes reps in the real formats: email a project manager, reply to an open-source maintainer, keep up in a busy group chat.

Instead of flashcards or generic chatbot windows, you practice inside rooms that look and feel like the real thing: email threads, Slack, GitHub issues, WhatsApp, Telegram, Discord, Teams, LinkedIn, and customer support chats. An AI persona plays the other side of the conversation. A coach reads every message you send and helps you sound natural.

And it's BYOK: bring your own OpenRouter key and it's yours to run. Swap models from the admin panel (cheap-and-fast through frontier), watch exactly what every user costs you, and pay the provider directly. No markup, no lock-in.

## How it works

1. **Pick a scene.** Ten formats, from formal email threads to casual chats, or describe your own scenario.
2. **Prepare.** A short interview (one question at a time, three follow-ups max) turns your situation into a concrete scenario and a conversation partner.
3. **Write.** The persona replies in character, in the register of the platform: crisp in email, fast and casual in chat.
4. **Get coached.** Each message you send comes back marked up: grammar fixes, tone notes, and a more natural rewrite when yours reads stiff. Strong phrasing from the persona gets flagged as worth stealing.

Sign-in is Google only. Every account gets a free daily message allowance (30 by default, configurable), and an admin dashboard at `/admin` shows per-user usage, tokens, and cost, plus controls for models, prompts, scenario templates, and limits.

## Stack

- [Convex](https://convex.dev) for the database, auth, and AI actions
- [OpenRouter](https://openrouter.ai) for models, hot-swappable from the admin panel
- React 19, Vite, and [TanStack Router](https://tanstack.com/router)
- Tailwind CSS with shadcn/ui, Biome, Bun

## Running it yourself

You need [Bun](https://bun.sh), a free [Convex](https://convex.dev) account, an [OpenRouter](https://openrouter.ai) API key, and Google OAuth credentials.

```bash
bun install
bunx convex dev   # creates a dev deployment and writes .env.local
```

Configure the backend. These live on the Convex deployment, not in a local file:

```bash
bunx convex env set OPENROUTER_API_KEY sk-or-...
bunx convex env set ADMIN_EMAIL you@example.com
bunx convex env set AUTH_GOOGLE_ID your-client-id.apps.googleusercontent.com
bunx convex env set AUTH_GOOGLE_SECRET your-client-secret
bunx convex env set SITE_URL http://localhost:3000/inklish
```

For the Google credentials, create an OAuth client (web application) in the [Google Cloud console](https://console.cloud.google.com/apis/credentials) and add this authorized redirect URI, using the deployment name `bunx convex dev` printed:

```
https://<your-deployment>.convex.site/api/auth/callback/google
```

The web client doesn't use `.env` files — its Convex URL lives in [`src/lib/env.ts`](src/lib/env.ts). In dev it points at a local Convex deployment (`http://127.0.0.1:3210`); if `bunx convex dev` gave you a cloud dev deployment instead, put its `.convex.cloud` URL there.

Then start the app in a second terminal:

```bash
bun run dev
```

Open http://localhost:3000/inklish, sign in with Google, and start a session. The account matching `ADMIN_EMAIL` sees `/admin`; everyone else gets a 404 there.

## Scripts

| Command | What it does |
| --- | --- |
| `bun run dev` | Vite dev server on port 3000 |
| `bunx convex dev` | Convex dev deployment with live push |
| `bun run build` | Production build |
| `bun run deploy` | Deploy Convex functions, build, and deploy the Worker |
| `bun run test` | Vitest |
| `bun run check` | Biome lint + format |

## Deploying

The live app runs at [fahrezi.fyi/inklish](https://fahrezi.fyi/inklish), served by a Cloudflare Worker: `wrangler.jsonc` routes `fahrezi.fyi/inklish*` to the Worker, and [`worker/index.ts`](worker/index.ts) strips the `/inklish` prefix before serving the static build (anything else on the route falls through to the site's origin).

```bash
bun run deploy                          # convex/ changed: deploy backend + frontend
bun run build && bunx wrangler deploy   # frontend-only changes
```

The app is mounted under the `/inklish` base path. To host your own copy at a different path (or at the root), change it in four places: `base` in `vite.config.ts`, `basepath` in `src/main.tsx`, `BASE` in `worker/index.ts`, and the route in `wrangler.jsonc` — plus the prod Convex URL in `src/lib/env.ts` and your deployment's `SITE_URL`.

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup and conventions.

## License

[MIT](LICENSE)
