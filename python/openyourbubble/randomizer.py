from __future__ import annotations

import random
from typing import Optional

from .categories import CategoryGraph, load_graph


class Randomizer:
    def __init__(self, graph: Optional[CategoryGraph] = None) -> None:
        self.graph = graph or load_graph()

    def pick_subject(self, group: Optional[str] = None, professional: Optional[bool] = None) -> dict:
        if group:
            pool = self.graph.by_group(group, professional=professional)
        else:
            pool = [
                cat
                for cat in self.graph.all()
                if professional is None or cat.professional is professional
            ]
        if not pool:
            raise ValueError("no categories available for the selected filters")
        choice = random.choice(pool)
        lineage = []
        for parent_slug in choice.parents:
            parent = self.graph.get(parent_slug)
            if parent:
                lineage.append(parent.label)
        return {
            "slug": choice.slug,
            "label": choice.label,
            "group": choice.group,
            "tags": choice.tags,
            "professional": choice.professional,
            "parents": choice.parents,
            "path": lineage,
        }
