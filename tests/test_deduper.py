from __future__ import annotations

from lead_tracker.deduper import Deduper, ExistingLead


def make(lead_id, phone="", parent="", student="", tab="Leads"):
    return ExistingLead(
        row_index=2,
        tab=tab,
        lead_id=lead_id,
        phone=phone,
        parent_name=parent,
        student_name=student,
        notes="",
    )


def test_phone_match():
    d = Deduper([make("L1", phone="+919876500001", parent="Ramesh", student="Aarav")])
    r = d.check("+919876500001", None, None)
    assert r.is_duplicate and r.match.lead_id == "L1"


def test_name_match_case_insensitive():
    d = Deduper([make("L1", phone="", parent="Sunita Verma", student="Kavya Verma")])
    r = d.check(None, "SUNITA VERMA", "kavya verma")
    assert r.is_duplicate


def test_cross_tab_review_also_dedupes():
    d = Deduper([make("L2", phone="+919876500002", tab="Review")])
    r = d.check("+919876500002", None, None)
    assert r.is_duplicate and r.match.tab == "Review"


def test_no_match():
    d = Deduper([make("L1", phone="+919876500001", parent="A", student="B")])
    r = d.check("+919876500099", "X", "Y")
    assert not r.is_duplicate


def test_register_updates_index():
    d = Deduper([])
    d.register(make("L1", phone="+919876500001"))
    assert d.check("+919876500001", None, None).is_duplicate


def test_name_match_requires_both_names():
    d = Deduper([make("L1", parent="Ramesh", student="Aarav")])
    # Only parent name given → should NOT dedupe on name alone
    r = d.check(None, "Ramesh", None)
    assert not r.is_duplicate
