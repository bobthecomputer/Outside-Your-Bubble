from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Optional

import typer

from .categories import load_graph
from .ingest import Ingestor
from .llm import MaybeModel
from .professional import ProfessionalBriefing
from .randomizer import Randomizer
from .study import StudySuggester
from .translate import Translator

app = typer.Typer(help="OpenYourBubble local toolkit")


def _model_from_options(model: Optional[str], model_path: Optional[Path]) -> MaybeModel:
    if model_path:
        return MaybeModel(model_path=model_path)
    return MaybeModel()


def _stdin_payload() -> Optional[str]:
    if sys.stdin.isatty():
        return None
    data = sys.stdin.read()
    return data.strip() or None


@app.command()
def random_subject(
    group: Optional[str] = typer.Option(None, help="Filter by category group"),
    professional: bool = typer.Option(False, help="Restrict to professional categories"),
) -> None:
    graph = load_graph()
    randomizer = Randomizer(graph)
    subject = randomizer.pick_subject(group=group, professional=professional or None)
    typer.echo(json.dumps(subject, ensure_ascii=False))


@app.command()
def study_suggest(
    topic: str = typer.Option(..., help="Primary topic or intent"),
    category: str = typer.Option(..., help="Category slug"),
    article_path: Optional[Path] = typer.Option(None, help="Path to article text"),
    text: Optional[str] = typer.Option(None, help="Inline article text"),
    mode: str = typer.Option("quen-3.4b", help="Model mode (quen-3.4b, quen-3.4b-thinking, quen-2.5, quen-2.5-thinking)"),
    model_path: Optional[Path] = typer.Option(None, help="Path to GGUF model for llama.cpp"),
) -> None:
    payload = text
    if article_path:
        payload = article_path.read_text(encoding="utf-8")
    if not payload:
        payload = _stdin_payload()
    if not payload:
        raise typer.BadParameter("Article text required via --article-path or --text")
    graph = load_graph()
    model = _model_from_options(mode, model_path)
    suggester = StudySuggester(graph=graph, model=model)
    suggestion = suggester.suggest(topic=topic, category=category, article_text=payload, mode=mode)
    suggestion.category = graph.get(category).label if graph.get(category) else category
    typer.echo(json.dumps(suggestion.to_dict(), ensure_ascii=False))


@app.command()
def professional_brief(
    topic: str = typer.Option(...),
    category: str = typer.Option(...),
    persona: str = typer.Option("strategist", help="strategist|designer|investor"),
    article_path: Optional[Path] = typer.Option(None),
    text: Optional[str] = typer.Option(None),
    mode: str = typer.Option("quen-3.4b", help="Model mode"),
    model_path: Optional[Path] = typer.Option(None, help="Path to GGUF model"),
) -> None:
    payload = text
    if article_path:
        payload = article_path.read_text(encoding="utf-8")
    if not payload:
        payload = _stdin_payload()
    if not payload:
        raise typer.BadParameter("Article text required")
    graph = load_graph()
    model = _model_from_options(mode, model_path)
    briefing = ProfessionalBriefing(graph=graph, model=model)
    brief = briefing.brief(topic=topic, category=category, article_text=payload, persona=persona, mode=mode)
    brief.category = graph.get(category).label if graph.get(category) else category
    typer.echo(json.dumps(brief.to_dict(), ensure_ascii=False))


@app.command()
def ingest(
    feed_url: str = typer.Option(..., help="RSS/Atom URL"),
    limit: int = typer.Option(20, help="Limit number of items"),
) -> None:
    graph = load_graph()
    ingestor = Ingestor(graph)
    items = ingestor.ingest_feed(feed_url)[:limit]
    typer.echo(json.dumps([item.to_dict() for item in items], ensure_ascii=False))


@app.command()
def translate(
    text: Optional[str] = typer.Option(None, help="Text to translate"),
    source_lang: Optional[str] = typer.Option(None, help="Source language code"),
    target_lang: str = typer.Option("en", help="Target language code"),
) -> None:
    payload = text or _stdin_payload()
    if not payload:
        raise typer.BadParameter("Translation text required via --text or stdin")
    translator = Translator(to_lang=target_lang)
    result = translator.translate(payload, source_lang)
    typer.echo(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    app()
