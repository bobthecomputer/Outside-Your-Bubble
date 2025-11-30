# Outside Your Bubble – Refactor and Delivery Roadmap

## Priorities at a glance
- **Deck refactor first:** untangle the monolithic `src/app/deck/page.tsx` into composable pieces so we can iterate quickly.
- **Reliability next:** add a test harness (unit + component + API smoke) to protect ingestion, summarization, verification, and deck interactions.
- **Resilience:** replace the in-memory rate limiter with a shared store (Redis) and align error responses.
- **Onboarding:** ship runnable defaults (.env example + Docker Compose) so contributors can boot the stack without guesswork.

## Deck refactor plan
1) **Component breakout**
   - Extract presentational pieces from `src/app/deck/page.tsx` into `/src/components/deck/` (e.g., `DeckShell`, `CardStack`, `SwipeControls`, `ShareDialog`, `StudyModal`, `BriefModal`).
   - Move swipe/gesture logic into a hook (e.g., `useDeckSwipes`) that manages motion values, thresholds, and callbacks.
   - Keep data-fetching concerns in a thin container (app route or hook) that passes typed props into the components.

2) **State & data flow**
   - Co-locate transient UI state (modal open flags, selected card) with the deck route while keeping data state in a dedicated hook (e.g., `useDeckData` that fetches `/api/deck`, handles pagination, and integrates ranking once ready).
   - Standardize card types/interfaces under `types/deck.ts` and share across components and API handlers.

3) **Styling & accessibility**
   - Preserve existing motion/feel but add ARIA labels to swipe buttons and keyboard shortcuts for skip/learn/save/mute.
   - Reduce repeated Tailwind strings with `clsx` helpers or variant utilities.

4) **Integration checkpoints**
   - Step 1: create shell + card stack with mocked data (parity with current visuals).
   - Step 2: wire to live `/api/deck` data and swipe mutations.
   - Step 3: attach ranking outputs once helpers land.

## Testing strategy (proposal)
- **Unit**: Vitest for lib modules (ingest hashing/novelty, summarizer fallback selection, verification status mapping).
- **Component**: React Testing Library for UI pieces (ItemCard, Deck card stack interactions with mocked swipes).
- **Integration**: Supertest against Next.js API routes (deck, swipe, random subject) using a test database schema.
- **Playwright (optional)**: smoke the deck page for swipe/keyboard flows if CI resources allow.
- **Fixtures**: add deterministic sample feeds and summaries for repeatability.

## Rate limiting & resilience plan
- Swap in **Redis** (local or hosted) for rate-limit storage; prefer a simple sliding window keyed by route + IP/user.
- Provide a small adapter so API routes can depend on an interface rather than a concrete limiter (supports future BullMQ jobs).
- Standardize error envelopes: `{ error: { code, message }, retryAfter? }` with HTTP 429 where appropriate.

## Onboarding improvements
- Add `.env.example` with all required keys (GitHub OAuth, email provider, Serper, Ollama URL, database URL).
- Provide `docker-compose.yml` for Postgres + Redis + optional local Ollama; include `make`/npm scripts to bootstrap.
- Write a quickstart doc (`docs/getting-started.md`) covering seed data, running ingestion/verification scripts, and sample CLI calls.

## Suggested sequencing
1. Land deck refactor scaffold (component extraction + hooks) with parity tests.
2. Introduce testing harness and first unit/component specs.
3. Implement Redis-backed rate limiting with consistent errors.
4. Ship onboarding assets (.env example + compose + quickstart) and keep docs synced.
