from __future__ import annotations

import json
import logging
import time as _time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import requests

from .config import Config
from .normalizer import normalize_phone

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent / "prompts"


@dataclass
class Extraction:
    parent_name: str | None
    student_name: str | None
    class_: str | None
    interest: str
    phone: str | None
    location: str | None
    notes: str | None
    confidence: float
    raw: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "parent_name": self.parent_name,
            "student_name": self.student_name,
            "class": self.class_,
            "interest": self.interest,
            "phone": self.phone,
            "location": self.location,
            "notes": self.notes,
            "confidence": self.confidence,
        }


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / name).read_text(encoding="utf-8")


CLASSIFIER_PROMPT = _load_prompt("classifier.txt")
EXTRACTOR_PROMPT = _load_prompt("extractor.txt")


class OllamaError(RuntimeError):
    pass


class OllamaClient:
    def __init__(
        self,
        url: str,
        model: str,
        fallback_model: str | None = None,
        timeout: float = 120.0,
    ) -> None:
        self.url = url.rstrip("/")
        self.model = model
        self.fallback_model = fallback_model
        self.timeout = timeout
        self.latencies: list[float] = []

    def list_models(self) -> list[str]:
        try:
            resp = requests.get(f"{self.url}/api/tags", timeout=5)
            resp.raise_for_status()
        except requests.RequestException as e:
            raise OllamaError(f"Ollama not reachable at {self.url}: {e}") from e
        data = resp.json()
        return [m.get("name", "") for m in data.get("models", [])]

    def ensure_ready(self) -> str:
        models = self.list_models()
        if not models:
            raise OllamaError(
                "No models installed. Run `ollama pull llama3.1:8b` first."
            )
        if self.model in models:
            return self.model
        if self.fallback_model and self.fallback_model in models:
            logger.warning(
                "Primary model %s not installed; falling back to %s",
                self.model,
                self.fallback_model,
            )
            self.model = self.fallback_model
            return self.model
        raise OllamaError(
            f"Neither {self.model} nor {self.fallback_model} is installed. "
            f"Run `ollama pull {self.model}`."
        )

    def generate_json(self, prompt: str, temperature: float = 0.1) -> dict[str, Any]:
        body = {
            "model": self.model,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {"temperature": temperature},
        }
        start = _time.time()
        try:
            resp = requests.post(
                f"{self.url}/api/generate", json=body, timeout=self.timeout
            )
            resp.raise_for_status()
        except requests.RequestException as e:
            raise OllamaError(f"Ollama request failed: {e}") from e
        finally:
            self.latencies.append(_time.time() - start)
        text = resp.json().get("response", "").strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise OllamaError(f"Invalid JSON from model: {text[:200]}") from e

    def latency_stats(self) -> dict[str, float]:
        if not self.latencies:
            return {"count": 0, "avg": 0.0, "max": 0.0}
        return {
            "count": len(self.latencies),
            "avg": sum(self.latencies) / len(self.latencies),
            "max": max(self.latencies),
        }


def classify(client: OllamaClient, message: str) -> bool:
    prompt = CLASSIFIER_PROMPT.replace("{message}", message)
    try:
        data = client.generate_json(prompt, temperature=0.0)
    except OllamaError as e:
        logger.warning("Classifier failed, treating as non-lead: %s", e)
        return False
    return bool(data.get("is_lead", False))


def extract(
    client: OllamaClient, message: str, failed_log: Path | None = None
) -> Extraction | None:
    prompt = EXTRACTOR_PROMPT.replace("{message}", message)
    data: dict[str, Any] | None = None
    for attempt, temp in enumerate((0.1, 0.0)):
        try:
            data = client.generate_json(prompt, temperature=temp)
            break
        except OllamaError as e:
            logger.warning("Extractor attempt %d failed: %s", attempt + 1, e)
    if data is None:
        if failed_log is not None:
            failed_log.parent.mkdir(parents=True, exist_ok=True)
            with open(failed_log, "a", encoding="utf-8") as f:
                f.write(json.dumps({"message": message}, ensure_ascii=False) + "\n")
        return None

    return _coerce(data, message)


def _coerce(data: dict[str, Any], message: str) -> Extraction:
    interest = (data.get("interest") or "unknown").lower()
    if interest not in {"school", "hostel", "both", "unknown"}:
        interest = "unknown"

    phone_raw = data.get("phone")
    if isinstance(phone_raw, (int, float)):
        phone_raw = str(int(phone_raw))
    phone_norm = normalize_phone(phone_raw)

    confidence = data.get("confidence")
    try:
        confidence = float(confidence) if confidence is not None else 0.5
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))

    if phone_raw and not phone_norm.valid:
        confidence = max(0.0, confidence - 0.2)

    return Extraction(
        parent_name=_str_or_none(data.get("parent_name")),
        student_name=_str_or_none(data.get("student_name")),
        class_=_str_or_none(data.get("class")),
        interest=interest,
        phone=phone_norm.normalized if phone_raw else None,
        location=_str_or_none(data.get("location")),
        notes=_str_or_none(data.get("notes")),
        confidence=confidence,
        raw=data,
    )


def _str_or_none(v: Any) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    if not s or s.lower() in {"null", "none", "n/a", "na", "unknown"}:
        return None
    return s


def build_client(cfg: Config) -> OllamaClient:
    return OllamaClient(
        url=cfg.ollama_url,
        model=cfg.ollama_model,
        fallback_model=cfg.fallback_model,
    )
