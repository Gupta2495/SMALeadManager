from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date, datetime, time
from pathlib import Path
from typing import Iterable

from .normalizer import message_id


@dataclass
class Message:
    msg_id: str
    date: date
    time: time
    sender: str
    body: str
    system: bool = False

    @property
    def date_str(self) -> str:
        return self.date.isoformat()

    @property
    def time_str(self) -> str:
        return self.time.strftime("%H:%M")


# WhatsApp export header patterns. Handles:
#   12/04/2026, 10:15 - Sender: body
#   [12/04/2026, 10:15:03] Sender: body
#   4/12/26, 10:15 AM - Sender: body
#   [4/12/26, 10:15:03 AM] Sender: body
_HEADER_RE = re.compile(
    r"""
    ^\[?                                     # optional [
    (?P<date>\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})
    [,\s]+
    (?P<time>\d{1,2}:\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)
    \]?                                      # optional ]
    \s*[-\u2013]\s*                           # dash separator
    (?P<rest>.*)$
    """,
    re.VERBOSE,
)
# Alternative form: closing bracket without dash (iOS style)
_HEADER_RE_IOS = re.compile(
    r"""
    ^\[
    (?P<date>\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{2,4})
    [,\s]+
    (?P<time>\d{1,2}:\d{2}(?::\d{2})?\s?(?:[AaPp]\.?[Mm]\.?)?)
    \]
    \s*
    (?P<rest>.*)$
    """,
    re.VERBOSE,
)

# System lines (no sender): joined, left, added, end-to-end encryption, etc.
_SYSTEM_MARKERS = (
    "Messages and calls are end-to-end",
    "created group",
    "added",
    "left",
    "removed",
    "changed the subject",
    "changed this group's icon",
    "changed the group description",
    "joined using this group's invite link",
    "You deleted this message",
    "This message was deleted",
    "<Media omitted>",
    "null",
)


def _parse_date(raw: str) -> date:
    raw = raw.replace(".", "/").replace("-", "/")
    parts = raw.split("/")
    if len(parts) != 3:
        raise ValueError(f"Unrecognized date: {raw!r}")
    d, m, y = parts
    # WhatsApp exports use day-first in most locales; fall back if day > 12 impossible.
    day, month, year = int(d), int(m), int(y)
    if year < 100:
        year += 2000
    # If month > 12, assume month-first (US locale)
    if month > 12 and day <= 12:
        day, month = month, day
    return date(year, month, day)


def _parse_time(raw: str) -> time:
    raw = raw.strip().upper().replace(".", "")
    ampm = None
    if raw.endswith("AM") or raw.endswith("PM"):
        ampm = raw[-2:]
        raw = raw[:-2].strip()
    parts = raw.split(":")
    hour = int(parts[0])
    minute = int(parts[1]) if len(parts) > 1 else 0
    second = int(parts[2]) if len(parts) > 2 else 0
    if ampm == "PM" and hour < 12:
        hour += 12
    elif ampm == "AM" and hour == 12:
        hour = 0
    return time(hour, minute, second)


def _match_header(line: str) -> tuple[str, str, str] | None:
    m = _HEADER_RE.match(line)
    if m:
        return m.group("date"), m.group("time"), m.group("rest")
    m = _HEADER_RE_IOS.match(line)
    if m:
        return m.group("date"), m.group("time"), m.group("rest")
    return None


def _is_system_body(rest: str) -> bool:
    # No colon → system line (no sender)
    if ":" not in rest:
        return True
    for marker in _SYSTEM_MARKERS:
        if marker in rest:
            return True
    return False


def iter_messages(lines: Iterable[str]) -> Iterable[Message]:
    current: dict | None = None

    def emit(entry: dict) -> Message:
        body = entry["body"].strip()
        mid = message_id(
            entry["date"].isoformat(),
            entry["time"].strftime("%H:%M:%S"),
            entry["sender"],
            body,
        )
        return Message(
            msg_id=mid,
            date=entry["date"],
            time=entry["time"],
            sender=entry["sender"],
            body=body,
            system=entry["system"],
        )

    for raw_line in lines:
        # Strip BOM / invisible chars WhatsApp inserts
        line = raw_line.replace("\u200e", "").replace("\u200f", "").rstrip("\n")
        if not line.strip() and current is not None:
            current["body"] += "\n"
            continue
        header = _match_header(line)
        if header is None:
            if current is not None:
                current["body"] += ("\n" if current["body"] else "") + line
            continue
        # Flush previous
        if current is not None:
            yield emit(current)
            current = None

        date_raw, time_raw, rest = header
        try:
            d = _parse_date(date_raw)
            t = _parse_time(time_raw)
        except ValueError:
            continue

        if _is_system_body(rest):
            current = {
                "date": d,
                "time": t,
                "sender": "",
                "body": rest,
                "system": True,
            }
            continue

        sender, _, body = rest.partition(":")
        current = {
            "date": d,
            "time": t,
            "sender": sender.strip(),
            "body": body.lstrip(),
            "system": False,
        }

    if current is not None:
        yield emit(current)


def parse_file(path: Path) -> list[Message]:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return list(iter_messages(f))


def filter_by_date(
    messages: Iterable[Message],
    since: date | None = None,
    until: date | None = None,
) -> list[Message]:
    out: list[Message] = []
    for m in messages:
        if since and m.date < since:
            continue
        if until and m.date > until:
            continue
        out.append(m)
    return out


def filter_non_system(messages: Iterable[Message]) -> list[Message]:
    return [m for m in messages if not m.system and m.body.strip()]
