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
- 2026-01-09: Added Vitest as the testing harness and wrote normalization specs for `normalizeSummaryCitations` to start covering ingestion/summary utilities; follow-up to extend coverage to ranking and deck helpers.
- 2026-01-10: Hardened ingestion by adding external extractor fallbacks (Jina reader + configurable article API), refreshed env docs, and covered extractor selection with Vitest.
- 2026-01-11: Centralized deck data/UI types in `src/types/deck.ts` and extracted deck UI building blocks (evidence dialog, learning sheet, achievement toasts, action buttons, progress ring) into `src/components/deck/` to start the deck refactor; follow-up: continue breaking down `app/deck/page.tsx` into data/hooks + presentational pieces and wire components to the deck/ranking helpers when they land.
- 2025-12-01: Captured an assessment of current rehabilitation status and prioritized follow-ups (finish deck refactor hooks/data split, extend tests to ingestion/summarization/verification + deck UI, implement Redis-backed rate limiting, and continue onboarding polish with Docker + env templates) to guide next steps.
- 2025-12-01: Began the deck refactor in code by extracting API helpers plus `useDeckData` (deck load + achievements) and `useDeckSwipes` (gesture/keyboard handling), wiring `app/deck/page.tsx` to use them to thin data/gesture logic; follow-up: continue splitting the deck UI into presentational shells/card stacks and add tests around the new hooks.
- 2025-12-01: Pulled the deck header/controls into a `DeckHeader` component and re-used the data/swipe hooks to further slim `app/deck/page.tsx`; follow-up: extract the card/article shell next and add RTL/Vitest coverage for header + hooks.
- 2025-12-01: Extracted the deck card shell into `DeckCardPanel`, passing all data/gesture state through the new hooks for a thinner `app/deck/page.tsx`; follow-up: break out remaining subcomponents (card stack/container) and start RTL/Vitest coverage for header/panel + hooks.
- 2025-12-01: Added `DeckCardContainer` to own the loading/error/empty wrapper around `DeckCardPanel`, simplifying `app/deck/page.tsx` and keeping presentational pieces isolated for upcoming card stack extraction and RTL/Vitest coverage.
- 2025-12-01: Moved the partner share dialog into `ShareDialog` and re-exported deck components; `app/deck/page.tsx` now composes header, container, and dialog from `src/components/deck/`, ready for card-stack extraction and tests.
- 2025-12-01: Added RTL/Vitest setup (jsdom, jest-dom) plus unit tests for `DeckCardContainer` and `ShareDialog`; mocked prisma globally in Vitest setup to avoid generated client requirements during UI/unit tests.
- 2025-12-01: Added RTL/Vitest coverage for `DeckHeader`, `useDeckSwipes`, and `useDeckData` (with mocked deck APIs), and confirmed the test suite passes after refactor extractions.
- 2025-12-01: Added a heuristic article classifier (`scoreArticleQuality`) with tests, and an `ingest:run` script that ingests configured sources, summarizes, verifies, applies lenses, and logs quality scores; updated package scripts to include it (no DB schema change required yet).
- 2025-12-02: Replaced the in-memory rate limiter with a Redis-backed helper and standard 429 error envelopes, updated all API routes to use it, and added Vitest coverage for limiter behavior; follow-up: ensure `REDIS_URL` is configured in all environments and watch logs for any Redis fallback noise. Added a `redis:check` script and documented REDIS_URL defaults; local Redis is not running on this host (docker unavailable), so re-run the check once a Redis service is up.
- 2025-12-23: Audited the current UI surfaces and deck flow against the roadmap, and drafted a visual/feature gap plan covering a UI refresh, remaining deck refactor splits, ranking integration, and test/onboarding follow-ups.
- 2025-12-23: Introduced a premium visual system (new fonts, dark/bright palette variables, and non-purple accents) and restyled the deck, learning path sheet, home hero, sign-in screen, site header, and feed cards to match; follow-up: add a light-mode toggle and continue the deck refactor + ranking integration.
- 2025-12-23: Extracted the deck action bar into a presentational component and wired personalization scoring into deck building using stored user preferences (topics, serendipity, nationality) to prioritize candidates before deduping.
- 2025-12-23: Continued the deck refactor by introducing a card stack wrapper and controls shell, moving swipe gesture handlers to the stack layer and keeping action controls in a dedicated shell.
- 2025-12-28: Added a one-command quickstart script (Docker + Prisma + preview), documented it in onboarding docs, and added a `prisma:seed` script for consistent setup.
- 2025-12-28: Switched quickstart to a plain Node script (no tsx dependency), added auto-install of npm deps with a `--skip-install` option, and updated docs accordingly to smooth first-run onboarding.
- 2025-12-28: Hardened the quickstart script on Windows by running shell-spawned commands to avoid `spawn EINVAL` failures during `npm install`.
- 2025-12-28: Added Windows shell-spawn support to the preview runner to avoid `spawn EINVAL` failures when launching `npm run dev` and sample ingest.
- 2025-12-28: Standardized Windows command execution for quickstart/preview to call `npm` through the shell (avoiding direct `npm.cmd`) to reduce `spawn EINVAL` errors.
