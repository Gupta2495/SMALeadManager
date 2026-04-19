#!/usr/bin/env python3
"""
One-time WhatsApp → Supabase lead importer for Shree Madhav Academy.

Setup:
    pip install anthropic requests python-dotenv

Dry run (no DB writes):
    python scripts/extract_leads.py ~/Downloads/_chat.txt --dry-run

Import for real:
    python scripts/extract_leads.py ~/Downloads/_chat.txt
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

# Load .env from repo root (gitignored)
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env", override=True)
except ImportError:
    pass

import anthropic
import requests


def _require(key: str) -> str:
    val = os.environ.get(key)
    if not val:
        sys.exit(f"Missing env var: {key}  (set it in .env at repo root)")
    return val


SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY", "")


SYSTEM_PROMPT = """\
You extract school admission leads from a WhatsApp group chat.

Context: Shree Madhav Academy, Mandsaur, Madhya Pradesh, India.
Programs: main school, hostel, and Madhav Kids (nursery / playgroup).
Members post lead info in a mix of English and Hindi.

Return ONLY a JSON array — no prose, no markdown, no code fences.
Each element is one lead with exactly these keys:

  student_name   string        (required)
  parent_name    string|null
  phone          string|null   normalize to 10 digits: strip +91, spaces, dashes, leading 0
  class_label    string|null   e.g. "Nursery", "LKG", "3rd", "6th", "11th PCM", "11th Agriculture"
  location       string|null   village or city name
  notes          string|null   hostel interest, Madhav Kids, referral source, visit dates, any context
  source_from    string        sender name from the WhatsApp header
  source_date    string        YYYY-MM-DD from the message timestamp (convert DD/MM/YY)
  source_message string        full original message text (join multi-line content)

Rules:
- One object per student. A single message naming two students → two objects.
- Skip: "image omitted", "Contact card omitted", "added", "This message was deleted", "‎".
- Skip admin broadcast messages not about a specific lead.
- If phone is missing, still include the lead with phone: null.
- Keep Hindi names and places as-is.
- When multiple consecutive messages from the same sender are clearly one lead entry,
  combine them into one source_message.
"""


def call_claude(chat_text: str) -> list[dict]:
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": (
                    "Extract all admission leads from this WhatsApp chat export.\n\n"
                    + chat_text
                ),
            }
        ],
    )
    raw = msg.content[0].text.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)


def normalize_phone(raw):
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw))
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    return digits if len(digits) == 10 else None


def build_payload(lead: dict) -> dict:
    return {
        k: v
        for k, v in {
            "student_name": (lead.get("student_name") or "").strip() or None,
            "parent_name": (lead.get("parent_name") or "").strip() or None,
            "phone": normalize_phone(lead.get("phone")),
            "class_label": (lead.get("class_label") or "").strip() or None,
            "location": (lead.get("location") or "").strip() or None,
            "notes": (lead.get("notes") or "").strip() or None,
            "source_from": (lead.get("source_from") or "").strip() or None,
            "source_msg_date": lead.get("source_date") or None,
            "source_message": (lead.get("source_message") or "").strip() or None,
            "status": "new",
            "confidence": 0.9,
            "needs_review": False,
        }.items()
        if v is not None
    }


def print_leads(leads: list[dict]) -> None:
    print(f"\n{'=' * 60}")
    print(f"DRY RUN — {len(leads)} leads extracted")
    print("=" * 60)
    no_phone = []
    for i, lead in enumerate(leads, 1):
        phone = normalize_phone(lead.get("phone")) or "⚠ no phone"
        if "⚠" in phone:
            no_phone.append(lead)
        print(
            f"\n{i:>3}. {lead.get('student_name', '?'):<22} "
            f"{(lead.get('class_label') or '—'):<12} "
            f"{phone:<14} "
            f"{lead.get('location') or '—'}"
        )
        if lead.get("parent_name"):
            print(f"       Parent : {lead['parent_name']}")
        if lead.get("notes"):
            print(f"       Notes  : {lead['notes']}")
    if no_phone:
        print(f"\n⚠  {len(no_phone)} leads have no phone — they will be skipped on real import.")


def insert_leads(leads: list[dict]) -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — cannot insert.")

    url = f"{SUPABASE_URL}/rest/v1/leads"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    inserted = skipped_dup = skipped_no_phone = errors = 0

    for lead in leads:
        payload = build_payload(lead)

        if not payload.get("phone"):
            skipped_no_phone += 1
            print(f"  skip (no phone): {payload.get('student_name')}")
            continue

        resp = requests.post(
            url,
            headers=headers,
            json=payload,
            params={"on_conflict": "phone"},
        )

        if resp.status_code in (200, 201):
            inserted += 1
        elif resp.status_code == 409:
            skipped_dup += 1
        else:
            errors += 1
            print(f"  error {resp.status_code} for {payload.get('student_name')}: {resp.text[:200]}")

    print(
        f"\n✓ Inserted: {inserted}  "
        f"Duplicate (skipped): {skipped_dup}  "
        f"No phone (skipped): {skipped_no_phone}  "
        f"Errors: {errors}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Import WhatsApp chat leads into Supabase")
    parser.add_argument("chat_file", help="Path to WhatsApp _chat.txt export")
    parser.add_argument("--dry-run", action="store_true", help="Extract and print leads, no DB writes")
    args = parser.parse_args()

    if not ANTHROPIC_KEY:
        sys.exit("Missing ANTHROPIC_API_KEY — set it in .env at repo root")

    chat_text = Path(args.chat_file).read_text(encoding="utf-8")
    print(f"Chat file: {args.chat_file} ({len(chat_text):,} chars)")
    print("Calling Claude API…")

    leads = call_claude(chat_text)
    print(f"Extracted {len(leads)} leads.")

    if args.dry_run:
        print_leads(leads)
    else:
        insert_leads(leads)


if __name__ == "__main__":
    main()
