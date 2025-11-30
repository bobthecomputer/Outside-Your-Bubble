# Getting started

This guide boots a local Outside Your Bubble stack with Postgres, Redis, and optional MailHog for email previews.

## 1) Prerequisites
- Node.js 20+
- pnpm or npm
- Docker + Docker Compose

## 2) Clone and install
```bash
pnpm install
# or: npm install
```

## 3) Configure environment
- Copy `.env.example` to `.env` and fill in secrets.
- For local development you can keep the defaults for Postgres/Redis/MailHog.

```bash
cp .env.example .env
```

Key fields to set early:
- `NEXTAUTH_SECRET`: any long random string.
- `GITHUB_ID` / `GITHUB_SECRET`: GitHub OAuth credentials if you want GitHub login.
- `EMAIL_FROM` and SMTP details (defaults map to MailHog running from Compose).
- `SERPER_API_KEY`: required for verification search.
- `OLLAMA_BASE_URL` and `OLLAMA_MODELS`: point to your local or remote LLM server.

## 4) Start services
Use Docker Compose to launch the backing services.
```bash
docker compose up -d postgres redis mailhog
```
- Postgres: `postgres://oyb:oyb@localhost:5432/oyb`
- Redis: `redis://localhost:6379`
- MailHog UI: http://localhost:8025

## 5) Prepare the database
Generate Prisma client and apply migrations:
```bash
pnpm prisma:generate
pnpm prisma:migrate
```

Optional: open Prisma Studio to inspect data.
```bash
pnpm prisma:studio
```

## 6) Run the app
```bash
pnpm dev
```
Visit http://localhost:3000.

## 7) Seed and scripts
- Sample ingestion: `pnpm ingest:sample`
- Verify pending items: `pnpm verify:pending`
- Summarize pending items: `pnpm summarize:pending`
- Preview deck data: `pnpm preview`

## 8) Python helpers (optional)
The API can call the Python CLI (under `python/`). Ensure your Python environment is available:
```bash
python3 -m pip install -e ./python
```
Update `OYB_PYTHON_BIN`/`OYB_PYTHON_CLI` in `.env` if you use a virtualenv.

## 9) Next steps
- Check `docs/roadmap.md` for refactor/testing priorities.
- Keep `PROGRESS.md` updated after each task to record outcomes and new objectives.
