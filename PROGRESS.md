# Outside Your Bubble – Progress Tracker

## Latest context
- Codebase audit and UI concept were provided on 2025-11-30 (see `docs/ui-prototype.md`).
- Mission: keep Outside Your Bubble moving forward with a local-first, diverse-news experience, preserving summarization, verification, and swipe-deck UX.
- Roadmap and progress are paired: check this tracker **and** `docs/roadmap.md` before starting any work.

## Preserved references
- UI concept captured in `docs/ui-prototype.md` (for inspiration and future rebuilds).
- Audit snapshot summarized key strengths (ingestion, summarization, verification, auth) and gaps (monolithic deck, missing ranking helpers, basic rate limiting, no tests, onboarding friction).

## Active goals
- Stabilize direction and keep historical context handy for future contributors.
- Incrementally refactor the deck experience into smaller components/hooks without losing functionality.
- Finish ranking/personalization helpers promised in the ZEST roadmap and wire them into deck building.
- Improve rate limiting and error-handling robustness (move beyond in-memory limiter).
- Add automation: unit/integration tests for ingestion, summarization, verification, and critical UI flows.
- Improve developer onboarding (environment examples, docs, and local services such as DB/LLM/Redis if needed).

## Roadmap & plans
- Delivery roadmap lives in `docs/roadmap.md` (covers deck refactor steps, testing strategy, rate limiting migration, and onboarding upgrades).

## Working agreements for contributors
- Before starting any task, read this file **and** `docs/roadmap.md` to understand current goals and preserved assets.
- At the end of each task, append a short **Update** section summarizing what changed and list any new objectives or follow-ups.
- Keep `docs/ui-prototype.md` intact as a historical design reference.

## Open follow-ups
- Execute the deck refactor plan in `docs/roadmap.md` (component extraction, hooks, and state/data split).
- Stand up the proposed testing stack (Vitest + React Testing Library + Supertest) and add initial specs for ingestion, summarization, verification, and deck UI interactions.
- Implement Redis-backed rate limiting with standardized error envelopes per the roadmap notes.
- Keep onboarding assets (`.env.example`, `docker-compose.yml`, quickstart) in sync with the codebase.
- Smoke-test the new onboarding assets (Compose + env template) and keep them aligned with code changes.

## Updates
- 2025-11-30: Added this progress tracker, preserved the provided UI concept in `docs/ui-prototype.md`, and documented contributor agreements for keeping objectives current.
- 2025-11-30: Captured a concrete roadmap in `docs/roadmap.md` (deck refactor steps, testing approach, rate limiting, onboarding) and aligned follow-ups to execute against it.
- 2025-12-01: Linked progress to the roadmap explicitly, refreshed contributor guidance, and added onboarding assets (.env example, Docker Compose, getting-started guide) plus a follow-up to validate them.
