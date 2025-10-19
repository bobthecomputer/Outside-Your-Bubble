from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

try:  # pragma: no cover - optional dependency
    from argostranslate import package as argos_package  # type: ignore
    from argostranslate import translate as argos_translate  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    argos_package = None  # type: ignore
    argos_translate = None  # type: ignore


@dataclass
class Translator:
    from_lang: str = "auto"
    to_lang: str = "en"

    def available(self) -> bool:
        return bool(argos_package and argos_translate)

    def translate(self, text: str, source_lang: Optional[str] = None) -> dict:
        if not text.strip():
            return {"text": "", "provider": "none", "detected": source_lang or None}
        if not self.available():
            return {
                "text": text,
                "provider": "identity",
                "detected": source_lang or None,
                "note": "Argos Translate not installed; returning original text.",
            }
        argos_package.install_from_path  # ensure module is imported
        from_code = source_lang or self.from_lang
        translator = argos_translate.get_translation(from_code, self.to_lang)
        if translator is None:
            return {
                "text": text,
                "provider": "identity",
                "detected": source_lang or None,
                "note": "No translation pair available; returning original text.",
            }
        translated = translator.translate(text)
        return {
            "text": translated,
            "provider": "argos-translate",
            "detected": from_code if from_code != "auto" else None,
        }


__all__ = ["Translator"]
