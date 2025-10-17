# Outside Your Bubble (OYB)

Wider view. Better you.

Outside Your Bubble is an experimentation ground for a verification-first intelligence feed. It ingests scholarly and news sources, generates structured briefs with citations, and surfaces verification status, context lenses, and personal impact prompts.

## Key capabilities

- **Next.js 15 + Tailwind** application scaffolded with App Router and brand-forward layout.
- **Authentication** via NextAuth (GitHub OAuth + magic link email provider) backed by Prisma + PostgreSQL.
- **Command palette** (⌘/Ctrl + K) powered by `cmdk` to trigger ingestion, summarization, verification, and analytics stubs.
- **Data contracts** implemented with Prisma for User, Source, Item, Summary, Verification, Lens, Task, CreateArtifact, Feedback, RankingLog, and Policy.
- **Ingestion v1** for arXiv and RSS sources with URL canonicalization, text hashing dedupe, and offline fallbacks for restricted environments.
- **Summarizer** and **verification engine** powered by lightweight open-source models (≤4B params by default, starting with `qwen2.5:4b-instruct`) with deterministic fallbacks when the community endpoint is unreachable.
- **Context lenses & micro-tasks** stored alongside each item for richer interpretation.
- **Home feed** rendering provenance tiers, verification badges, evidence tables, reflection prompts, and personal impact cues.
- **Targeted personalization** that weights preferred topics at probability ~1 while still injecting serendipitous, culturally diverse coverage based on the user's stated nationality.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment template and fill in secrets as available:

   ```bash
   cp .env.example .env.local
   ```

   Required minimum for local testing:

   - `DATABASE_URL` pointing to a PostgreSQL instance (the repo uses a local cluster in development).
   - `NEXTAUTH_SECRET` (generate via `openssl rand -base64 32`).
   - Optional: `GITHUB_ID`/`GITHUB_SECRET`, `RESEND_API_KEY`, `SERPER_API_KEY`.
   - Community model configuration: `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`) and either `OLLAMA_MODELS` (comma-separated priority list) or `OLLAMA_MODEL` (single fallback). Defaults target OSS models at ≤4B parameters.

   Install and run [Ollama](https://ollama.com/download) (or another compatible community inference server) locally, then pull the default model:

   ```bash
   # pull the recommended small-model set (pick the ones you plan to use)
   ollama pull qwen2.5:4b-instruct
   ollama pull gemma2:2b-instruct
   ollama pull llama3.2:3b-instruct
   ollama pull smollm2:1.7b-instruct
   ollama pull phi3:mini
   ollama serve
   ```

3. Apply database schema and seed baseline sources:

   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   npm run prisma:studio # optional for inspection
   npx prisma db seed
   ```

4. Run sample ingestion (uses live feeds when possible, otherwise offline samples):

   ```bash
   npm run ingest:sample
   ```

5. Start the live preview tool (runs Next.js dev server and refreshes sample data whenever the repo changes):

   ```bash
   npm run preview
   ```

   This command boots `next dev` and replays `npm run ingest:sample` after each file change so the UI always reflects fresh content.

   If you just want the plain dev server without auto-refreshing data:

   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to explore the feed. Use the command palette (⌘/Ctrl + K) to trigger additional flows.

## Recommended community models (≤4B params)

| Model | Why it matters | Notes |
| --- | --- | --- |
| **Qwen3-4B-Instruct** | Strong general-purpose SLM with optional “thinking” mode, easy to quantize/serve locally. | Available via Hugging Face, OpenRouter, and community Ollama builds. |
| **Gemma-2-2B-IT** | Portable and efficient for constrained hardware. | Works with Ollama, MLX, and WebLLM stacks. |
| **Llama-3.2-3B-Instruct** | Broad ecosystem support and reliable hosted endpoints. | Runs on Workers AI, Bedrock, Hugging Face Inference, and community servers. |
| **SmolLM2-1.7B-Instruct** | Ultra-lean Apache-2.0 option suited for on-device UX. | Published on Hugging Face with GGUF artifacts. |
| **Phi-3.5-mini-3.8B** | Long-context permissive model for reasoning-heavy briefs. | Distributed by Microsoft/NVIDIA with MIT license. |

Vision-language companions worth testing: **Qwen3-VL-4B-Instruct**, **Qwen2.5-VL-3B/7B**, **MiniCPM-V-2.6**, and **Llama-3.2-11B-Vision** (if you need OCR/tables/screenshots).

For embeddings and reranking, consider **gte-Qwen2-1.5B/7B**, **Snowflake Arctic-Embed 2.0**, **Nomic-embed-text-v1.5**, and rerankers like **BGE-reranker-v2-m3** or hosted **Qwen3-Reranker-4B**.

## Community ingestion routes & tooling

Outside Your Bubble prioritizes officially documented APIs, but several community-maintained routes expand coverage when terms allow:

- **YouTube**: Invidious (`/api/v1/search`, `/api/v1/videos/:id`, `/api/v1/captions/:id`) or Piped (JSON API). Libraries: `youtubei.js`, `ytdl-core`, `yt-dlp` for metadata/streams.
- **X / Twitter**: Nitter RSS feeds, plus scrapers such as `snscrape` or `twscrape` (respect rate limits and TOS).
- **Reddit**: Redlib (ex-Libreddit), direct `/r/<sub>.json` endpoints, Pushshift monthly dumps for history.
- **TikTok**: ProxiTok alt front-end, community scrapers (`tiktok-scraper`, `TikTok-Api`).
- **Open social**: Bluesky AT Protocol (public `app.bsky.*` endpoints), Mastodon REST + streaming APIs.
- **Metasearch & feeds**: Self-hosted SearXNG JSON API, RSS-Bridge for sites without RSS.
- **Archiving**: Wayback Machine “Save Page Now” endpoints, Common Crawl CDX index.

Always respect robots.txt, apply exponential backoff, and prefer official APIs when feasible.

## Scripts

- `npm run ingest:sample` — ingest one scholarly + one news source, summarize, verify, and apply a domain lens.
- `npm run summarize:pending` — summarize items without briefs.
- `npm run verify:pending` — run verification pipeline for items missing reports.
- `npm run rank:train` — computes a personalized slate preview with topic/geodiversity weights for the first user.
- `npm run feedback:report` — aggregate feedback signals (stub).
- `npm run preview` — Next.js dev server + auto-refreshing sample data when files change.

## Testing & linting

- `npm run lint`

## Architecture notes

- Prisma migrations live under `prisma/migrations`. Offline ingestion samples provide deterministic data when network access is unavailable.
- The verification pipeline attempts Serper-based web search when an API key is provided; otherwise it records “independent corroboration not found” and marks items as `DEVELOPING`.
- Summaries and claim extraction call the configured community LLM endpoint (Ollama-compatible). When the endpoint is unavailable, deterministic fallbacks provide baseline content so the UI remains populated.
- Summaries now persist a dedicated reflection question so every card nudges the reader to interrogate new perspectives.
- The personalization helper (`src/lib/ranking/personalization.ts`) converts user preferences (`topics`, `serendipity`, `homeCountry`/nationality) into a probability-weighted slate that boosts preferred subjects, filters out negatively conflicting verification states, and uplifts news from outside the user's region.
- Swipe policy helpers (`src/lib/ranking/swipe-policy.ts`) ensure the planned “Tinder-like” browser forces a reflective card after a configurable number of swipes, preventing mindless skipping.
- Region tags (`region:<ISO>` strings) are auto-added during ingestion so ranking can intentionally surface news from other parts of the world.

## Asset policy

The project intentionally omits binary/icon assets to keep PR diffs text-only. Add brand artwork through remote URLs or vector inline SVGs when necessary.

## Roadmap

See `ZEST.yaml` for structured step tracking (next step: creation tools & go-deeper experiences).
