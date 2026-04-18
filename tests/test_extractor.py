from __future__ import annotations

import json
from pathlib import Path

import pytest

from lead_tracker.extractor import (
    OllamaClient,
    OllamaError,
    _coerce,
    classify,
    extract,
)


class FakeClient(OllamaClient):
    def __init__(self, responses):
        super().__init__(url="http://x", model="m")
        self._responses = list(responses)

    def generate_json(self, prompt, temperature=0.1):
        r = self._responses.pop(0)
        if isinstance(r, Exception):
            raise r
        return r


def test_classify_true():
    c = FakeClient([{"is_lead": True}])
    assert classify(c, "parent Ramesh student Aarav class 8 9876500001")


def test_classify_false():
    c = FakeClient([{"is_lead": False}])
    assert not classify(c, "Good morning")


def test_classify_swallows_errors():
    c = FakeClient([OllamaError("boom")])
    assert classify(c, "x") is False


def test_extract_valid_json():
    data = {
        "parent_name": "Ramesh Kumar",
        "student_name": "Aarav",
        "class": "8",
        "interest": "school",
        "phone": "9876500001",
        "location": "Mandsaur",
        "notes": None,
        "confidence": 0.92,
    }
    c = FakeClient([data])
    ext = extract(c, "msg")
    assert ext is not None
    assert ext.parent_name == "Ramesh Kumar"
    assert ext.phone == "+919876500001"
    assert ext.interest == "school"
    assert 0.9 <= ext.confidence <= 1.0


def test_extract_retries_then_fails(tmp_path: Path):
    c = FakeClient([OllamaError("bad"), OllamaError("bad2")])
    log = tmp_path / "failed.log"
    ext = extract(c, "msg", failed_log=log)
    assert ext is None
    assert log.exists()
    line = log.read_text().strip()
    assert json.loads(line)["message"] == "msg"


def test_extract_retries_then_succeeds():
    ok = {
        "parent_name": "A",
        "student_name": "B",
        "class": "8",
        "interest": "school",
        "phone": "9876500001",
        "location": None,
        "notes": None,
        "confidence": 0.8,
    }
    c = FakeClient([OllamaError("bad"), ok])
    ext = extract(c, "msg")
    assert ext is not None
    assert ext.student_name == "B"


def test_coerce_invalid_phone_penalizes_confidence():
    data = {
        "parent_name": "A",
        "student_name": "B",
        "class": "8",
        "interest": "school",
        "phone": "123",
        "confidence": 0.9,
    }
    ext = _coerce(data, "msg")
    assert ext.confidence == pytest.approx(0.7)


def test_coerce_clamps_confidence():
    ext = _coerce({"interest": "unknown", "confidence": 2.0}, "m")
    assert ext.confidence == 1.0
    ext2 = _coerce({"interest": "unknown", "confidence": -1}, "m")
    assert ext2.confidence == 0.0


def test_coerce_invalid_interest_defaults_unknown():
    ext = _coerce({"interest": "bogus", "confidence": 0.5}, "m")
    assert ext.interest == "unknown"


def test_coerce_strips_null_strings():
    ext = _coerce(
        {"parent_name": "null", "student_name": "N/A", "interest": "school",
         "confidence": 0.5},
        "m",
    )
    assert ext.parent_name is None
    assert ext.student_name is None


def test_idempotent_extract_on_same_input():
    data = {
        "parent_name": "A", "student_name": "B", "class": "8",
        "interest": "school", "phone": "9876500001", "confidence": 0.85,
    }
    c1 = FakeClient([data])
    c2 = FakeClient([data])
    a = extract(c1, "msg")
    b = extract(c2, "msg")
    assert a.to_dict() == b.to_dict()
