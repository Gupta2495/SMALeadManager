from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from .normalizer import name_key


@dataclass
class ExistingLead:
    row_index: int  # 1-based row number in the sheet (including header)
    tab: str  # "Leads" or "Review"
    lead_id: str
    phone: str
    parent_name: str
    student_name: str
    notes: str


@dataclass
class DedupeResult:
    is_duplicate: bool
    match: ExistingLead | None = None
    reason: str = ""


class Deduper:
    def __init__(self, existing: Iterable[ExistingLead]) -> None:
        self._by_names: dict[tuple[str, str], ExistingLead] = {}
        for lead in existing:
            parent_k = name_key(lead.parent_name)
            student_k = name_key(lead.student_name)
            if parent_k and student_k:
                self._by_names[(parent_k, student_k)] = lead

    def check(
        self,
        phone: str | None,
        parent_name: str | None,
        student_name: str | None,
    ) -> DedupeResult:
        parent_k = name_key(parent_name or "")
        student_k = name_key(student_name or "")
        if parent_k and student_k:
            hit = self._by_names.get((parent_k, student_k))
            if hit is not None:
                return DedupeResult(
                    True, hit, f"name match: {parent_name} / {student_name}"
                )
        return DedupeResult(False)

    def register(self, lead: ExistingLead) -> None:
        parent_k = name_key(lead.parent_name)
        student_k = name_key(lead.student_name)
        if parent_k and student_k:
            self._by_names[(parent_k, student_k)] = lead
