from __future__ import annotations

import hashlib
import re
import unicodedata
from dataclasses import dataclass


@dataclass
class PhoneResult:
    normalized: str
    valid: bool
    raw: str


_NON_DIGIT = re.compile(r"[^\d]")


def normalize_phone(raw: str | None) -> PhoneResult:
    if not raw:
        return PhoneResult(normalized="", valid=False, raw=raw or "")
    digits = _NON_DIGIT.sub("", raw)
    if len(digits) == 10:
        return PhoneResult(normalized=f"+91{digits}", valid=True, raw=raw)
    if len(digits) == 12 and digits.startswith("91"):
        return PhoneResult(normalized=f"+{digits}", valid=True, raw=raw)
    if len(digits) == 13 and digits.startswith("091"):
        return PhoneResult(normalized=f"+{digits[1:]}", valid=True, raw=raw)
    if len(digits) == 11 and digits.startswith("0"):
        return PhoneResult(normalized=f"+91{digits[1:]}", valid=True, raw=raw)
    return PhoneResult(normalized=raw.strip(), valid=False, raw=raw)


def normalize_name(name: str | None) -> str:
    if not name:
        return ""
    cleaned = unicodedata.normalize("NFKC", name).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def name_key(name: str | None) -> str:
    return normalize_name(name).casefold()


def message_id(date_str: str, time_str: str, sender: str, body: str) -> str:
    payload = f"{date_str}|{time_str}|{sender.strip()}|{body.strip()}"
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]
