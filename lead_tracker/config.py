from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml
from dotenv import load_dotenv

DEFAULT_CONFIG_PATHS = [
    Path(os.environ.get("LEAD_TRACKER_CONFIG", "")),
    Path.home() / ".config" / "lead_tracker" / "config.yaml",
    Path.cwd() / "config.yaml",
]


@dataclass
class Config:
    sheet_name: str = "Madhav Admissions Leads"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"
    fallback_model: str = "llama3.2:3b"
    group_name_filter: str | None = None
    default_assignee: str = "Admissions"
    timezone: str = "Asia/Kolkata"
    batch_size: int = 15
    review_confidence_threshold: float = 0.7
    service_account_path: str = "~/.config/lead_tracker/service_account.json"
    logs_dir: str = "./logs"
    failed_extractions_log: str = "./logs/failed_extractions.log"
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def service_account_file(self) -> Path:
        env_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if env_path:
            return Path(env_path).expanduser()
        return Path(self.service_account_path).expanduser()

    @property
    def logs_path(self) -> Path:
        return Path(self.logs_dir).expanduser()

    @property
    def failed_extractions_path(self) -> Path:
        return Path(self.failed_extractions_log).expanduser()


def _first_existing(paths: list[Path]) -> Path | None:
    for p in paths:
        if p and str(p) and p.exists():
            return p
    return None


def load_config(explicit_path: str | Path | None = None) -> Config:
    load_dotenv(override=False)
    candidates = [Path(explicit_path)] if explicit_path else DEFAULT_CONFIG_PATHS
    path = _first_existing(candidates)
    if path is None:
        return Config(raw={})
    data = yaml.safe_load(path.read_text()) or {}
    cfg = Config(
        sheet_name=data.get("sheet_name", Config.sheet_name),
        ollama_url=data.get("ollama_url", Config.ollama_url),
        ollama_model=data.get("ollama_model", Config.ollama_model),
        fallback_model=data.get("fallback_model", Config.fallback_model),
        group_name_filter=data.get("group_name_filter"),
        default_assignee=data.get("default_assignee", Config.default_assignee),
        timezone=data.get("timezone", Config.timezone),
        batch_size=int(data.get("batch_size", Config.batch_size)),
        review_confidence_threshold=float(
            data.get("review_confidence_threshold", Config.review_confidence_threshold)
        ),
        service_account_path=data.get(
            "service_account_path", Config.service_account_path
        ),
        logs_dir=data.get("logs_dir", Config.logs_dir),
        failed_extractions_log=data.get(
            "failed_extractions_log", Config.failed_extractions_log
        ),
        raw=data,
    )
    return cfg
