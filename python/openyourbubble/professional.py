from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from .categories import CategoryGraph, load_graph
from .llm import MaybeModel
from .study import extract_keywords


@dataclass
class ProfessionalBrief:
    topic: str
    category: str
    key_points: List[str]
    creative_hook: str
    pitch_outline: List[str]
    visual_mood: str
    palette_ideas: List[str]
    canvas_prompt: str
    method: str

    def to_dict(self) -> Dict:
        return {
            "topic": self.topic,
            "category": self.category,
            "key_points": self.key_points,
            "creative_hook": self.creative_hook,
            "pitch_outline": self.pitch_outline,
            "visual_mood": self.visual_mood,
            "palette_ideas": self.palette_ideas,
            "canvas_prompt": self.canvas_prompt,
            "method": self.method,
        }


class ProfessionalBriefing:
    def __init__(
        self,
        graph: Optional[CategoryGraph] = None,
        model: Optional[MaybeModel] = None,
    ) -> None:
        self.graph = graph or load_graph()
        self.model = model or MaybeModel()

    def _persona_vibe(self, persona: str) -> str:
        return {
            "strategist": "Translate systemic shifts into a confident visual roadmap",
            "designer": "Capture tactile emotion and the human response to the story",
            "investor": "Express momentum, risk, and reward through bold contrasts",
        }.get(persona, "Make the narrative feel actionable for curious professionals")

    def _palette_from_keywords(self, keywords: List[str]) -> List[str]:
        palette: List[str] = []
        lowered = [kw.lower() for kw in keywords]

        def add(entry: str) -> None:
            if entry not in palette:
                palette.append(entry)

        for keyword in lowered:
            if any(tag in keyword for tag in ["climate", "forest", "green", "energy"]):
                add("Verdant pine, misty teal, and copper sparks for regenerative energy")
            if any(tag in keyword for tag in ["finance", "market", "economy", "bank"]):
                add("Slate blue, graphite, and gold linework for analytical clarity")
            if any(tag in keyword for tag in ["health", "bio", "care", "medical"]):
                add("Clean ivory, coral, and calm teal for wellbeing signals")
            if any(tag in keyword for tag in ["culture", "language", "word", "story"]):
                add("Sepia ink, violet, and warm amber for storytelling warmth")
            if any(tag in keyword for tag in ["technology", "ai", "chip", "data"]):
                add("Electric indigo, charcoal, and neon cyan for future-forward lines")

        if not palette:
            add("Charcoal, soft white, and aurora green for contrast and focus")
        if len(palette) < 2:
            add("Muted plum with luminous copper accents for depth")
        if len(palette) < 3:
            add("Deep navy, radiant orange, and silver threads for tension")
        return palette[:3]

    def _visual_mood(self, spotlight: str, persona: str, palette: List[str]) -> str:
        lead_palette = palette[0] if palette else "textured neutrals"
        return (
            f"{self._persona_vibe(persona)}. Let {spotlight} glow against {lead_palette} so the scene feels ready to paint."
        )

    def _canvas_prompt(self, spotlight: str, persona: str, keywords: List[str]) -> str:
        supporting = keywords[1] if len(keywords) > 1 else keywords[0] if keywords else spotlight
        return (
            f"Design a large-format piece where {spotlight} interacts with {supporting}."
            f" Layer typography, gesture, or collage that someone working as a {persona} could present to clients."
        )

    def brief(
        self,
        *,
        topic: str,
        category: str,
        article_text: str,
        persona: str = "strategist",
        mode: str = "quen-3.4b",
    ) -> ProfessionalBrief:
        keywords = extract_keywords(article_text)
        category_node = self.graph.get(category)
        category_label = category_node.label if category_node else category
        spotlight = keywords[0].strip() if keywords else topic
        palette = self._palette_from_keywords(keywords)

        if self.model.available(mode):
            enriched = self.model.generate_study(
                topic=topic,
                keywords=keywords,
                article_text=article_text,
                mode=mode,
            )
            if enriched:
                effective_spotlight = enriched.spotlight_subject or f"{category_label} · {spotlight}"
                return ProfessionalBrief(
                    topic=topic,
                    category=category_label,
                    key_points=enriched.questions,
                    creative_hook=enriched.presentation_prompt,
                    pitch_outline=enriched.impact_hints,
                    visual_mood=self._visual_mood(effective_spotlight, persona, palette),
                    palette_ideas=palette,
                    canvas_prompt=enriched.presentation_question
                    or self._canvas_prompt(effective_spotlight, persona, keywords),
                    method="quen",
                )

        persona_angle = {
            "strategist": "Highlight strategic leverage and risk mitigation",
            "designer": "Frame sensory cues, experience arcs, and emotional payoff",
            "investor": "Emphasize market traction, defensibility, and upside",
        }.get(persona, "Surface actionable insights and partnerships")
        effective_spotlight = f"{category_label} · {spotlight}"
        key_points = [
            f"Explain why this story matters for {category_label} practitioners right now.",
            f"Identify two data points or quotes that anchor the narrative around {topic}.",
            f"Outline a partner or collaborator who could amplify the impact.",
        ]
        creative_hook = (
            f"{persona_angle}. Shape a headline or opening visual that ties the piece to {topic}."
        )
        pitch_outline = [
            "Audience insight: who needs this update and what question keeps them up at night?",
            "Solution arc: how does the development shift their options?",
            "Follow-up: what artifact (deck, mural, prototype) will you produce to make it tangible?",
        ]
        canvas_prompt = self._canvas_prompt(effective_spotlight, persona, keywords)
        visual_mood = self._visual_mood(effective_spotlight, persona, palette)
        method = f"heuristic-{persona}"
        return ProfessionalBrief(
            topic=topic,
            category=category_label,
            key_points=key_points,
            creative_hook=creative_hook,
            pitch_outline=pitch_outline,
            visual_mood=visual_mood,
            palette_ideas=palette,
            canvas_prompt=canvas_prompt,
            method=method,
        )
