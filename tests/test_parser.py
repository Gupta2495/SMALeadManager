from __future__ import annotations

from datetime import date
from pathlib import Path

from lead_tracker.parser import (
    filter_by_date,
    filter_non_system,
    iter_messages,
    parse_file,
)

FIX = Path(__file__).parent / "fixtures"


def test_parses_clean_structured():
    msgs = parse_file(FIX / "clean_structured.txt")
    # 6 messages total
    assert len(msgs) == 6
    assert msgs[0].sender == "Director Sharma"
    assert msgs[0].date == date(2026, 4, 12)
    assert "Ramesh Kumar" in msgs[0].body


def test_parses_multiline_hinglish_and_devanagari():
    msgs = parse_file(FIX / "messy_hinglish.txt")
    assert len(msgs) == 7
    hindi = [m for m in msgs if "कल एक parent" in m.body]
    assert hindi, "Devanagari message should be parsed"


def test_parses_mixed_with_system_messages_and_multiline():
    msgs = parse_file(FIX / "mixed_realistic.txt")
    non_system = filter_non_system(msgs)
    # Multiline leads collapse into one message each
    sanjay = [m for m in non_system if "Sanjay Agrawal" in m.body]
    assert len(sanjay) == 1
    assert "Neha Agrawal" in sanjay[0].body
    # E2E encryption is flagged as system
    e2e = [m for m in msgs if m.system]
    assert any("end-to-end" in m.body for m in e2e)


def test_filter_by_date():
    msgs = parse_file(FIX / "mixed_realistic.txt")
    filtered = filter_by_date(
        msgs, since=date(2026, 4, 17), until=date(2026, 4, 17)
    )
    assert filtered, "Should keep Apr 17 messages"
    assert all(m.date == date(2026, 4, 17) for m in filtered)


def test_ios_bracket_format():
    lines = [
        "[12/04/2026, 09:15:03] Director Sharma: New lead parent Ramesh",
        "[12/04/2026, 09:16:00] Admin: ok",
    ]
    msgs = list(iter_messages(lines))
    assert len(msgs) == 2
    assert msgs[0].sender == "Director Sharma"


def test_ampm_format():
    lines = [
        "4/12/26, 10:15 AM - Director: morning lead parent Ramesh class 8",
        "4/12/26, 2:30 PM - Admin: ack",
    ]
    msgs = list(iter_messages(lines))
    assert msgs[0].time.hour == 10
    assert msgs[1].time.hour == 14
