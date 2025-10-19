from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import yake

from .categories import Category, CategoryGraph, load_graph
from .llm import MaybeModel


@dataclass
class StudySuggestion:
    topic: str
    category: str
    spotlight_subject: str
    questions: List[str]
    presentation_prompt: str
    presentation_question: str
    impact_hints: List[str]
    method: str

    def to_dict(self) -> Dict:
        return {
            "topic": self.topic,
            "category": self.category,
            "spotlight_subject": self.spotlight_subject,
            "questions": self.questions,
            "presentation_prompt": self.presentation_prompt,
            "presentation_question": self.presentation_question,
            "impact_hints": self.impact_hints,
            "method": self.method,
        }


_keyword_engine = yake.KeywordExtractor(n=3, top=12)


def extract_keywords(text: str) -> List[str]:
    scored = _keyword_engine.extract_keywords(text)
    return [phrase for phrase, score in sorted(scored, key=lambda item: item[1])]


class StudySuggester:
    def __init__(
        self,
        graph: Optional[CategoryGraph] = None,
        model: Optional[MaybeModel] = None,
    ) -> None:
        self.graph = graph or load_graph()
        self.model = model or MaybeModel()

    def _keywords(self, text: str) -> List[str]:
        return extract_keywords(text)

    def _compose_questions(self, topic: str, keywords: List[str], thinking: bool) -> List[str]:
        if not keywords:
            return [f"How does the latest development reshape the conversation around {topic}?",]

        focus = keywords[:3]
        prompts = [
            f"What evidence supports the claims around {focus[0]} and how reliable are the cited sources?",
        ]
        if len(focus) > 1:
            prompts.append(
                f"In what ways does {focus[1]} intersect with {topic}, and who stands to benefit or lose?"
            )
        if len(focus) > 2:
            prompts.append(
                f"Which stakeholders are positioned to respond to {focus[2]}, and what would success look like?"
            )
        if thinking:
            prompts.append(
                "Trace the chain of causes and effects described in the coverage. Where are the gaps you would investigate next?"
            )
        return prompts

    def _spotlight_subject(
        self,
        category: Optional[Category],
        keywords: List[str],
        topic: str,
    ) -> str:
        if keywords:
            anchor = keywords[0].strip()
            base_label = category.label if category else topic
            return f"{base_label} · {anchor}"
        if category:
            if category.parents:
                for parent_slug in category.parents:
                    parent = self.graph.get(parent_slug)
                    if parent:
                        return f"{parent.label} · {category.label}"
            return category.label
        return topic

    def _presentation_question(
        self,
        *,
        spotlight: str,
        topic: str,
        keywords: List[str],
        thinking: bool,
    ) -> str:
        if keywords:
            contrast = keywords[1] if len(keywords) > 1 else keywords[0]
            prompt = (
                f"How would you build a presentation around {spotlight} that helps peers studying {topic} understand the role of {contrast}?"
            )
        else:
            prompt = f"Which recent story would you spotlight to anchor a presentation on {topic}, and why does it matter now?"
        if thinking:
            prompt += " Outline the reasoning steps and evidence you would surface."
        return prompt

    def _impact(self, keywords: List[str], thinking: bool) -> List[str]:
        hints = []
        for idx, keyword in enumerate(keywords[:4]):
            emphasis = "long-tail" if idx > 1 else "immediate"
            hints.append(
                f"Assess the {emphasis} implications if {keyword} accelerates or stalls over the next quarter."
            )
        if thinking:
            hints.append("Map counterfactual scenarios and identify signals that would confirm or disprove them.")
        return hints or ["Document two key signals and outline how you would validate them in primary sources."]

    def suggest(
        self,
        *,
        topic: str,
        category: str,
        article_text: str,
        mode: str = "quen-3.4b",
    ) -> StudySuggestion:
        thinking = mode.endswith("thinking")
        keywords = self._keywords(article_text)
        category_node = self.graph.get(category)
        category_label = category_node.label if category_node else category
        spotlight = self._spotlight_subject(category_node, keywords, topic)
        if self.model.available(mode):
            enriched = self.model.generate_study(topic=topic, keywords=keywords, article_text=article_text, mode=mode)
            if enriched:
                enriched.category = category_label
                enriched.spotlight_subject = enriched.spotlight_subject or spotlight
                enriched.presentation_question = (
                    enriched.presentation_question
                    or self._presentation_question(
                        spotlight=enriched.spotlight_subject,
                        topic=topic,
                        keywords=keywords,
                        thinking=thinking,
                    )
                )
                return enriched
        questions = self._compose_questions(topic, keywords, thinking)
        impact = self._impact(keywords, thinking)
        angle = keywords[0] if keywords else topic
        presentation_prompt = (
            f"Build a short presentation that frames '{angle}' within the broader arc of {category_label}."
            " Open with a stakeholder story, follow with two data points, and close on an open question."
        )
        presentation_question = self._presentation_question(
            spotlight=spotlight,
            topic=topic,
            keywords=keywords,
            thinking=thinking,
        )
        method = "heuristic-thinking" if thinking else "heuristic"
        return StudySuggestion(
            topic=topic,
            category=category_label,
            spotlight_subject=spotlight,
            questions=questions,
            presentation_prompt=presentation_prompt,
            presentation_question=presentation_question,
            impact_hints=impact,
            method=method,
        )
