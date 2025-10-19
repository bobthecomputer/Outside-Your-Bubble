from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

try:
    from llama_cpp import Llama  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    Llama = None  # type: ignore


@dataclass
class MaybeModel:
    model_path: Optional[Path] = None
    preferred: str = "quen-3.4b"

    def _make(self) -> Optional["Llama"]:
        if Llama is None or self.model_path is None:
            return None
        return Llama(model_path=str(self.model_path), n_ctx=2048, n_threads=4)

    def available(self, mode: str) -> bool:
        if self.model_path is None or Llama is None:
            return False
        requested = mode.split(":", 1)[0]
        return requested in {"quen-3.4b", "quen-3.4b-thinking", "quen-2.5", "quen-2.5-thinking"}

    def generate_study(
        self,
        *,
        topic: str,
        keywords: Iterable[str],
        article_text: str,
        mode: str,
    ) -> Optional["StudySuggestion"]:
        llm = self._make()
        if llm is None:
            return None
        prompt = self._prompt(topic=topic, keywords=list(keywords), article_text=article_text, mode=mode)
        response = llm.create_completion(prompt=prompt, max_tokens=512, temperature=0.6)
        text = response["choices"][0]["text"].strip()
        return self._parse(text)

    def _prompt(self, *, topic: str, keywords: List[str], article_text: str, mode: str) -> str:
        thinking = mode.endswith("thinking")
        baseline = mode.split(":", 1)[0]
        reasoning = "Provide numbered reasoning steps before the answer." if thinking else "Respond succinctly."
        return (
            "You are an analyst coach helping people study relevant news. "
            f"Model variant: {baseline}. {reasoning}\n"
            f"Topic: {topic}\n"
            f"Keywords: {', '.join(keywords[:6])}\n"
            "Article:\n" + article_text + "\n"
            "Return JSON with keys questions (list), presentation_prompt, presentation_question, impact_hints (list),"
            " and spotlight_subject (string)."
        )

    def _parse(self, text: str):
        import json

        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            return None
        from .study import StudySuggestion

        return StudySuggestion(
            topic=payload.get("topic") or "",  # will be overwritten by caller
            category=payload.get("category") or "",
            spotlight_subject=payload.get("spotlight_subject") or payload.get("spotlightSubject") or "",
            questions=list(payload.get("questions", [])),
            presentation_prompt=payload.get("presentation_prompt", ""),
            presentation_question=payload.get("presentation_question")
            or payload.get("presentationQuestion")
            or "",
            impact_hints=list(payload.get("impact_hints", [])),
            method="quen",
        )


__all__ = ["MaybeModel"]
