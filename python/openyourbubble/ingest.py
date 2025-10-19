from __future__ import annotations

import datetime as dt
from dataclasses import dataclass
from typing import Iterable, List, Optional

import feedparser
import requests
from readability import Document
from bs4 import BeautifulSoup
import trafilatura

from .categories import CategoryGraph, load_graph


@dataclass
class IngestedItem:
    url: str
    title: str
    summary: str
    published_at: Optional[str]
    language: Optional[str]
    categories: List[str]
    text: str

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "title": self.title,
            "summary": self.summary,
            "published_at": self.published_at,
            "language": self.language,
            "categories": self.categories,
            "text": self.text,
        }


class Ingestor:
    def __init__(self, graph: Optional[CategoryGraph] = None) -> None:
        self.graph = graph or load_graph()

    def _pull_feed(self, url: str) -> feedparser.FeedParserDict:
        return feedparser.parse(url)

    def _resolve_categories(self, tags: Iterable[str]) -> List[str]:
        resolved = []
        normalized = {tag.strip().lower() for tag in tags if tag}
        for category in self.graph.all():
            if normalized.intersection({category.slug, category.label.lower(), *category.tags}):
                resolved.append(category.slug)
        return resolved or ["world"]

    def _extract_html(self, url: str) -> str:
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        html = response.text
        extracted = trafilatura.extract(html, include_comments=False, include_tables=False)
        if extracted:
            return extracted
        readable = Document(html)
        return BeautifulSoup(readable.summary(html_partial=True), "lxml").get_text("\n")

    def ingest_feed(self, url: str) -> List[IngestedItem]:
        feed = self._pull_feed(url)
        items: List[IngestedItem] = []
        for entry in feed.entries:
            link = entry.get("link")
            if not link:
                continue
            categories = self._resolve_categories(
                [term.get("term") for term in entry.get("tags", []) if isinstance(term, dict)]
            )
            text = self._extract_html(link)
            published = entry.get("published_parsed")
            iso = None
            if published:
                iso = dt.datetime(*published[:6], tzinfo=dt.timezone.utc).isoformat()
            language = entry.get("language") or feed.feed.get("language")
            items.append(
                IngestedItem(
                    url=link,
                    title=entry.get("title", ""),
                    summary=entry.get("summary", ""),
                    published_at=iso,
                    language=language,
                    categories=categories,
                    text=text,
                )
            )
        return items


__all__ = ["Ingestor", "IngestedItem"]
