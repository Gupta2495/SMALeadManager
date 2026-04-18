from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable

from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from .config import Config
from .deduper import ExistingLead

logger = logging.getLogger(__name__)

LEADS_HEADERS = [
    "lead_id",
    "captured_at",
    "source_msg_date",
    "parent_name",
    "student_name",
    "class",
    "interest",
    "phone",
    "location",
    "notes",
    "status",
    "assigned_to",
    "next_follow_up",
    "follow_up_count",
    "last_contact_at",
    "last_outcome",
    "source_message",
    "confidence",
]

REVIEW_HEADERS = LEADS_HEADERS  # same schema

FOLLOWUPS_HEADERS = [
    "follow_up_id",
    "lead_id",
    "attempted_at",
    "caller",
    "channel",
    "outcome",
    "next_follow_up_at",
    "notes",
]

RAW_HEADERS = [
    "msg_id",
    "date",
    "time",
    "sender",
    "body",
    "processed_at",
    "produced_lead_id",
]

TAB_SCHEMA: dict[str, list[str]] = {
    "Leads": LEADS_HEADERS,
    "Review": REVIEW_HEADERS,
    "Follow_ups": FOLLOWUPS_HEADERS,
    "Raw_Messages": RAW_HEADERS,
}


@dataclass
class LeadRow:
    lead_id: str
    captured_at: str
    source_msg_date: str
    parent_name: str
    student_name: str
    class_: str
    interest: str
    phone: str
    location: str
    notes: str
    status: str
    assigned_to: str
    next_follow_up: str
    follow_up_count: int
    last_contact_at: str
    last_outcome: str
    source_message: str
    confidence: float

    def to_row(self) -> list[Any]:
        return [
            self.lead_id,
            self.captured_at,
            self.source_msg_date,
            self.parent_name,
            self.student_name,
            self.class_,
            self.interest,
            self.phone,
            self.location,
            self.notes,
            self.status,
            self.assigned_to,
            self.next_follow_up,
            self.follow_up_count,
            self.last_contact_at,
            self.last_outcome,
            self.source_message,
            round(self.confidence, 3),
        ]


class SheetsClient:
    """Thin wrapper around gspread so we can mock easily in tests."""

    SCOPES = (
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    )

    def __init__(self, cfg: Config) -> None:
        self.cfg = cfg
        self._sh = None  # spreadsheet handle

    def connect(self):
        import gspread
        from google.oauth2.service_account import Credentials

        sa_path = self.cfg.service_account_file
        if not sa_path.exists():
            raise FileNotFoundError(
                f"Service account JSON not found at {sa_path}. See SETUP.md."
            )
        creds = Credentials.from_service_account_file(str(sa_path), scopes=self.SCOPES)
        gc = gspread.authorize(creds)
        try:
            self._sh = gc.open(self.cfg.sheet_name)
        except gspread.SpreadsheetNotFound:
            self._sh = gc.create(self.cfg.sheet_name)
            logger.info("Created new spreadsheet %r", self.cfg.sheet_name)
        return self._sh

    @property
    def spreadsheet(self):
        if self._sh is None:
            self.connect()
        return self._sh

    def ensure_tabs(self) -> dict[str, Any]:
        sh = self.spreadsheet
        out = {}
        existing = {ws.title: ws for ws in sh.worksheets()}
        for title, headers in TAB_SCHEMA.items():
            ws = existing.get(title)
            if ws is None:
                ws = sh.add_worksheet(title=title, rows=1000, cols=max(len(headers), 10))
                ws.append_row(headers, value_input_option="RAW")
                logger.info("Created tab %s", title)
            else:
                first_row = ws.row_values(1)
                if first_row != headers:
                    if not first_row:
                        ws.append_row(headers, value_input_option="RAW")
                    else:
                        logger.warning(
                            "Tab %s header mismatch. Expected %s, got %s",
                            title,
                            headers,
                            first_row,
                        )
            out[title] = ws
        # Remove the default "Sheet1" tab only if we created the spreadsheet.
        sheet1 = existing.get("Sheet1")
        if sheet1 is not None and len(existing) == 1 and "Leads" not in existing:
            try:
                sh.del_worksheet(sheet1)
            except Exception:
                pass
        return out

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        retry=retry_if_exception_type(Exception),
    )
    def load_existing_leads(self) -> list[ExistingLead]:
        sh = self.spreadsheet
        out: list[ExistingLead] = []
        for tab in ("Leads", "Review"):
            try:
                ws = sh.worksheet(tab)
            except Exception:
                continue
            records = ws.get_all_values()
            if len(records) < 2:
                continue
            headers = records[0]
            idx = {h: i for i, h in enumerate(headers)}
            for row_num, row in enumerate(records[1:], start=2):
                def col(name: str) -> str:
                    i = idx.get(name)
                    if i is None or i >= len(row):
                        return ""
                    return row[i]

                out.append(
                    ExistingLead(
                        row_index=row_num,
                        tab=tab,
                        lead_id=col("lead_id"),
                        phone=col("phone"),
                        parent_name=col("parent_name"),
                        student_name=col("student_name"),
                        notes=col("notes"),
                    )
                )
        return out

    def next_lead_id(self, today: str, existing_count: int) -> str:
        # today in YYYYMMDD form; existing_count is how many rows today already.
        return f"LEAD-{today}-{existing_count + 1:03d}"

    def count_today(self, today_prefix: str) -> int:
        sh = self.spreadsheet
        count = 0
        for tab in ("Leads", "Review"):
            try:
                ws = sh.worksheet(tab)
            except Exception:
                continue
            ids = ws.col_values(1)[1:]  # skip header
            count += sum(1 for i in ids if i.startswith(f"LEAD-{today_prefix}-"))
        return count

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        retry=retry_if_exception_type(Exception),
    )
    def append_lead(self, tab: str, row: LeadRow) -> None:
        ws = self.spreadsheet.worksheet(tab)
        ws.append_row(row.to_row(), value_input_option="USER_ENTERED")

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        retry=retry_if_exception_type(Exception),
    )
    def append_notes(self, existing: ExistingLead, extra_note: str) -> None:
        ws = self.spreadsheet.worksheet(existing.tab)
        notes_col = LEADS_HEADERS.index("notes") + 1
        current = ws.cell(existing.row_index, notes_col).value or ""
        merged = (current + "\n" if current else "") + extra_note
        ws.update_cell(existing.row_index, notes_col, merged)

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        retry=retry_if_exception_type(Exception),
    )
    def load_raw_message_ids(self) -> set[str]:
        try:
            ws = self.spreadsheet.worksheet("Raw_Messages")
        except Exception:
            return set()
        ids = ws.col_values(1)[1:]
        return set(ids)

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        retry=retry_if_exception_type(Exception),
    )
    def append_raw_messages(self, rows: Iterable[list[Any]]) -> None:
        batch = list(rows)
        if not batch:
            return
        ws = self.spreadsheet.worksheet("Raw_Messages")
        ws.append_rows(batch, value_input_option="RAW")
