#!/usr/bin/env python3
"""
Import leads.json into Supabase.
Usage: python scripts/import_json.py [--dry-run]
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env", override=True)
except ImportError:
    pass

import requests

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

LEADS_FILE = Path(__file__).parent / "leads.json"


def normalize_phone(raw):
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw))
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    return digits if len(digits) == 10 else None


def build_payload(lead, seen_phones, nophone_counter):
    phone = normalize_phone(lead.get("phone"))

    is_draft = False
    if phone and phone in seen_phones:
        # duplicate phone (sibling) — treat as draft
        phone = None
    elif phone:
        seen_phones.add(phone)

    if not phone:
        # placeholder satisfies NOT NULL + UNIQUE; shown in Review queue
        phone = f"NOPHONE-{nophone_counter[0]:03d}"
        nophone_counter[0] += 1
        is_draft = True

    notes = (lead.get("notes") or "").strip()
    if is_draft:
        notes = ("No phone number — needs follow-up. " + notes).strip()

    payload = {
        k: v for k, v in {
            "student_name": (lead.get("student_name") or "").strip() or None,
            "parent_name":  (lead.get("parent_name")  or "").strip() or None,
            "phone":        phone,
            "class_label":  (lead.get("class_label")  or "").strip() or None,
            "location":     (lead.get("location")     or "").strip() or None,
            "notes":        notes or None,
            "source_from":  (lead.get("source_from")  or "").strip() or None,
            "source_msg_date": lead.get("source_date") or None,
            "source_message":  (lead.get("source_message") or "").strip() or None,
            "status":       "new",
            "confidence":   0.9,
            "needs_review": is_draft,
        }.items() if v is not None
    }
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    leads = json.loads(LEADS_FILE.read_text(encoding="utf-8"))
    print(f"Loaded {len(leads)} leads from {LEADS_FILE.name}")

    seen_phones = set()
    nophone_counter = [1]
    payloads = [build_payload(l, seen_phones, nophone_counter) for l in leads]

    real   = sum(1 for p in payloads if not p["phone"].startswith("NOPHONE"))
    drafts = sum(1 for p in payloads if p["phone"].startswith("NOPHONE"))
    print(f"  With phone: {real}  |  Drafts (no phone): {drafts}")

    if args.dry_run:
        print("\nDRY RUN — first 10 payloads:")
        for p in payloads[:10]:
            print(f"  {p.get('student_name') or p.get('parent_name') or '?':<25} "
                  f"{p.get('class_label') or '—':<14} "
                  f"{p.get('phone') or 'NO PHONE':<12} "
                  f"{p.get('location') or '—'}")
        return

    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")

    url = f"{SUPABASE_URL}/rest/v1/leads"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    inserted = errors = 0

    for payload in payloads:
        resp = requests.post(
            url, headers=headers, json=payload,
            params={"on_conflict": "phone"},
        )
        if resp.status_code in (200, 201):
            inserted += 1
        else:
            errors += 1
            print(f"  error {resp.status_code} — {payload.get('student_name') or payload.get('parent_name')}: {resp.text[:150]}")

    print(f"\n✓ Inserted: {inserted}  |  Errors: {errors}")


if __name__ == "__main__":
    main()
