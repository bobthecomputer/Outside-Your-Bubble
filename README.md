# OpenYourBubble

Local-first intelligence briefings for people who want to stretch beyond their usual sources. OpenYourBubble ingests multilingual feeds, scores novelty, and then lets you explore cards in study, personal, or professional modes without depending on remote AI APIs.

## Highlights

- **Deck with random discovery** – swipe through curated cards, toggle **Random Mode** to shuffle the taxonomy, or tap **Random Subject** to jump anywhere in the hierarchy. Rich category tags (health, words, people, finance, climate, etc.) keep things grounded while you explore.
- **Study suggestions on demand** – tell the deck what you are studying and we will surface spotlight subjects, presentation questions, and impact hints based on the current article. The suggester can run in heuristic mode or through local Qwen "thinking" variants (2.5 or 3.4b) if you configure a GGUF model.
- **Professional side for individuals** – every card can pivot into a professional briefing that now calls out key points, creative hooks, visual mood, palette ideas, and a canvas prompt. Personas (strategist, designer, investor) change the angle, and the feature is available to every personal subscriber—no enterprise gating.
- **Secure peer mesh** – analytics stay local; optional encrypted replication lets lightweight peers share only hashed telemetry when you opt in.
- **Python toolkit** – the new `python/` package powers ingestion, translation, study helpers, and professional briefs. All commands emit JSON so the Next.js layer can call them without depending on hosted services.

## Stack Overview

- **Frontend / API**: Next.js 15 (App Router) + TypeScript + Tailwind (via PostCSS 4). All API routes are implemented in this repo—no external SaaS calls.
- **Database**: PostgreSQL via Prisma. Topics now carry category groupings, tags, professional flags, and default model preferences (`quen-3.4b` vs `quen-2.5`).
- **Python services**: Typer CLI with YAKE keyword extraction, trafilatura/readability-based scraping, and optional llama.cpp + Argos Translate extras.
- **Security**: rate limited API routes, sanitized event logging, and encrypted peer-to-peer relay (`/api/mesh/relay`).

## Setup

### Quickstart (one command)

```bash
npm run quickstart
```

This will create `.env.local` if needed, start Docker services (Postgres/Redis/MailHog), run Prisma generate/migrate/seed, and launch the preview server.
If dependencies are missing, it will run `npm install` automatically (use `--skip-install` to opt out).

Optional flags:
- `npm run quickstart -- --skip-docker` to skip Docker Compose.
- `npm run quickstart -- --skip-preview` to stop after setup.
- Extra args are forwarded to `npm run preview` (e.g. `--hostname 0.0.0.0 --port 3000`).

1. **Node dependencies**

   ```bash
   npm install
   ```

2. **Environment** – copy and edit your env file.

   ```bash
   cp .env.example .env.local
   ```

   Minimal local variables:

   - `DATABASE_URL` - PostgreSQL connection string.
   - `NEXTAUTH_SECRET` - e.g. `openssl rand -base64 32`.
   - `REDIS_URL` - Redis connection for rate limiting and background queues (e.g. `redis://localhost:6379/0`).
   - Optional toggles: `INGEST_TRANSLATE=true` to enable the local translator bridge, `INGEST_ENABLE_JINA_READER=false` to opt out of the built-in markdown fallback, `INGEST_ARTICLE_API_URL` / `INGEST_ARTICLE_API_KEY` for a paid extractor endpoint, `BETA_SHARE_ENABLED` / `NEXT_PUBLIC_BETA_SHARE_ENABLED` for the partner pitch beta, and mesh settings (`MESH_STORAGE_PATH`, `MESH_PEERS`, `MESH_SECRET`).

3. **Database**

   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   npx prisma db seed
   ```

4. **Python toolkit (recommended)**

   ```bash
   cd python
   python3 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -e .
   # optional extras
   pip install -e .[llm]
   pip install -e .[translate]
   ```

   The CLI is exposed as `oyb`. See `python/README.md` for command summaries.

5. **Start ingest preview**

   ```bash
   npm run preview
   ```

   This watches the repo, runs `next dev`, and refreshes sample ingestion on file changes.

### Previewing on desktop and mobile

- **Desktop:** visit `http://localhost:3000/deck` after running `npm run preview`.
- **LAN devices:** `npm run preview -- --hostname 0.0.0.0 --port 3000`, then open `http://<your-ip>:3000/deck` from your phone or tablet.
- **Viewport emulation:** in Chrome/Edge/Firefox hit `Ctrl/⌘ + Shift + M` to compare PC and mobile layouts quickly.

## Using the Deck

- **Modes:** switch between _Discover_, _Random_, _Study_, and _Professional_ directly in the deck header. Random mode keeps shuffling subjects, while Study and Professional modes call different Python helpers under the hood.
- **Random subject:** the header includes a Random Subject trigger (and Random mode toggle) that calls `/api/random/subject`, which bridges to `oyb random-subject`. Use it to jump to unfamiliar areas and unlock the Bubble Popper achievement quickly.
- **Categories & tags:** topic chips now expose group, sub-category, and rich tags (e.g. `health`, `wellbeing`, `grid`, `privacy`). Filters persist per session.
- **Study suggester:** the Study sidebar lets you select Qwen 3.4b, Qwen 2.5, or "thinking" variants. Suggestions are generated locally (YAKE + heuristics) unless you provide a GGUF file for llama.cpp.
- **Professional briefs:** click _Professional view_ to pick personas and receive key points, visual direction, palette ideas, and canvas prompts aimed at client deliverables. This is available to personal subscriptions; no enterprise tiering.

## Python Commands at a Glance

```bash
oyb random-subject --group science --professional
oyb study-suggest --topic "Climate finance" --category economy-climate < article.txt
oyb professional-brief --topic "Creative economy" --category creative --persona designer < article.txt
oyb ingest --feed-url https://www.oecd.org/about/newsroom/feeds/pressreleases-en.xml
oyb translate --source-lang de --target-lang en < article.txt
```

All commands print JSON. The Next.js API routes (`/api/random/subject`, `/api/study/suggest`, `/api/professional/brief`) call these via `python3 -m openyourbubble`. No external SaaS keys are required.

## Dataset & Local Training

Build enriched corpora (with topic metadata, alternate feeds, oEmbed context, study prompts, etc.) using:

```bash
npm run dataset:build
```

Outputs land in `data/datasets/` as timestamped JSONL + metadata, ready for fine-tuning or analytics.

## Scripts

- `npm run ingest:sample` - sample ingest + summarise + verify + lens.
- `npm run summarize:pending` / `npm run verify:pending` - catch up on outstanding jobs.
- `npm run redis:check` - ping Redis using `REDIS_URL` to confirm connectivity (watch for `rate-limit:redis-fallback` warnings in logs).
- `npm run rank:train` - refresh ranking weights.
- `npm run preview` - dev server + hot ingest loop.
- `npm run dataset:build` - export annotated corpora.

## Testing

- `npm run lint`
- `npx prisma generate`

## Architecture Notes

- Prisma models now include category metadata and default model hints so UI + Python stay aligned.
- Ingestion uses the enhanced scraper (microformats, AMP, oEmbed) and optional Argos-based translation without leaving your machine.
- Events are hashed and can replicate across peers using the mesh relay; no central control plane is needed.
- Asset policy stays text-first (SVGs only). Generated datasets are ignored via `.gitignore`.
