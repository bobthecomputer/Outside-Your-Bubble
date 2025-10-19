from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import orjson


@dataclass(frozen=True)
class Category:
    slug: str
    label: str
    group: str
    parents: List[str]
    tags: List[str]
    professional: bool = False


class CategoryGraph:
    """Hierarchical subject taxonomy used across the experience."""

    def __init__(self, categories: Optional[Iterable[Dict]] = None) -> None:
        if categories is None:
            categories = self._load_default()
        self._by_slug: Dict[str, Category] = {}
        self._by_group: Dict[str, List[Category]] = {}
        for entry in categories:
            cat = Category(
                slug=entry["slug"],
                label=entry["label"],
                group=entry.get("group", "general"),
                parents=list(entry.get("parents", [])),
                tags=sorted(set(entry.get("tags", []))),
                professional=bool(entry.get("professional", False)),
            )
            self._by_slug[cat.slug] = cat
            self._by_group.setdefault(cat.group, []).append(cat)

    def _load_default(self) -> List[Dict]:
        default_path = Path(__file__).with_name("categories.json")
        data = default_path.read_bytes()
        return orjson.loads(data)

    def all(self) -> List[Category]:
        return list(self._by_slug.values())

    def groups(self) -> List[str]:
        return sorted(self._by_group.keys())

    def by_group(self, group: str, professional: Optional[bool] = None) -> List[Category]:
        cats = self._by_group.get(group, [])
        if professional is None:
            return list(cats)
        return [cat for cat in cats if cat.professional is professional]

    def get(self, slug: str) -> Optional[Category]:
        return self._by_slug.get(slug)

    def tags_for(self, slug: str) -> List[str]:
        cat = self.get(slug)
        if not cat:
            return []
        return cat.tags

    def professional_categories(self) -> List[Category]:
        return [cat for cat in self._by_slug.values() if cat.professional]


def load_graph() -> CategoryGraph:
    return CategoryGraph()


__all__ = ["Category", "CategoryGraph", "load_graph"]
