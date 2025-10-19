# OpenYourBubble Python Toolkit

This package powers the local-first ingestion, random subject discovery, study helpers, and professional briefings that back the OpenYourBubble experience. It intentionally avoids remote API calls so that every computation runs on hardware you control.

## Quickstart

```bash
cd python
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -e .
```

Once installed you can inspect the available commands:

```bash
oyb --help
```

Key commands:

- `oyb random-subject` – pick a subject from the curated category graph (path + tags help power random mode).
- `oyb study-suggest` – craft spotlight subjects, presentation questions, and impact cues for a given topic and article text.
- `oyb professional-brief` – produce client-facing hooks with visual moods, palette ideas, and canvas prompts.
- `oyb ingest` – fetch and parse sources using the resilient scraper.

For optional local language modeling, install the extra requirements and point the CLI at your preferred GGUF file:

```bash
pip install -e .[llm]
oyb study-suggest --model quen-3.4b --model-path /path/to/quen-3.4b.gguf
```

All commands emit JSON so the Next.js layer can call into them without relying on remote APIs.
