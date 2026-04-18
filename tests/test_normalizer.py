from __future__ import annotations

from lead_tracker.normalizer import message_id, name_key, normalize_name, normalize_phone


def test_phone_10_digit():
    r = normalize_phone("9876500001")
    assert r.valid and r.normalized == "+919876500001"


def test_phone_with_spaces_and_dashes():
    r = normalize_phone("98765-00001")
    assert r.valid and r.normalized == "+919876500001"
    r2 = normalize_phone("98765 00001")
    assert r2.valid and r2.normalized == "+919876500001"


def test_phone_plus_91():
    r = normalize_phone("+919876500001")
    assert r.valid and r.normalized == "+919876500001"


def test_phone_91_prefix():
    r = normalize_phone("919876500001")
    assert r.valid and r.normalized == "+919876500001"


def test_phone_leading_zero():
    r = normalize_phone("09876500001")
    assert r.valid and r.normalized == "+919876500001"


def test_phone_invalid():
    r = normalize_phone("12345")
    assert not r.valid


def test_phone_empty():
    r = normalize_phone(None)
    assert not r.valid


def test_name_normalization():
    assert normalize_name("  Ramesh   Kumar ") == "Ramesh Kumar"
    assert name_key("Ramesh Kumar") == name_key("RAMESH KUMAR")


def test_message_id_stable():
    a = message_id("2026-04-12", "09:15", "Director", "hello")
    b = message_id("2026-04-12", "09:15", "Director", "hello")
    c = message_id("2026-04-12", "09:16", "Director", "hello")
    assert a == b
    assert a != c
