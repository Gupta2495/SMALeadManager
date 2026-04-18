from __future__ import annotations

import logging
import os
import sys
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Optional

import click
from rich.console import Console
from rich.table import Table

from .config import Config, load_config
from .deduper import Deduper, ExistingLead
from .extractor import (
    Extraction,
    OllamaClient,
    OllamaError,
    build_client,
    classify,
    extract,
)
from .logging_setup import setup_logging
from .parser import Message, filter_by_date, filter_non_system, parse_file
from .sheets import LeadRow, SheetsClient

logger = logging.getLogger(__name__)
console = Console()


@dataclass
class RunStats:
    total_messages: int = 0
    system_skipped: int = 0
    not_leads: int = 0
    extraction_failures: int = 0
    low_confidence: int = 0
    duplicates: int = 0
    new_leads: int = 0

    def table(self) -> Table:
        t = Table(title="Run Summary")
        t.add_column("Metric")
        t.add_column("Count", justify="right")
        for field_name in self.__dataclass_fields__:
            t.add_row(field_name, str(getattr(self, field_name)))
        return t


def _parse_iso_date(v: str | None) -> date | None:
    if not v:
        return None
    return datetime.strptime(v, "%Y-%m-%d").date()


def _build_lead_row(
    cfg: Config,
    ext: Extraction,
    msg: Message,
    lead_id: str,
    captured_at: str,
) -> LeadRow:
    return LeadRow(
        lead_id=lead_id,
        captured_at=captured_at,
        source_msg_date=msg.date.isoformat(),
        parent_name=ext.parent_name or "",
        student_name=ext.student_name or "",
        class_=ext.class_ or "Unknown",
        interest=ext.interest,
        phone=ext.phone or "",
        location=ext.location or "",
        notes=ext.notes or "",
        status="new",
        assigned_to=cfg.default_assignee,
        next_follow_up="",
        follow_up_count=0,
        last_contact_at="",
        last_outcome="",
        source_message=msg.body,
        confidence=ext.confidence,
    )


def _filter_group(messages: list[Message], group_filter: str | None) -> list[Message]:
    # In a WhatsApp export the group name is not per-message metadata; each export
    # is already scoped to one chat. We keep the filter for forward compatibility.
    return messages


@click.group()
@click.option("--config", "config_path", default=None, help="Path to config.yaml")
@click.pass_context
def cli(ctx: click.Context, config_path: Optional[str]) -> None:
    cfg = load_config(config_path)
    log_file = setup_logging(cfg.logs_path)
    logger.info("Logging to %s", log_file)
    ctx.obj = {"cfg": cfg, "log_file": log_file}


@cli.command()
@click.pass_context
def doctor(ctx: click.Context) -> None:
    """Check Ollama, Sheets, and config."""
    cfg: Config = ctx.obj["cfg"]
    ok = True

    console.print(f"[bold]Config[/]: sheet={cfg.sheet_name} model={cfg.ollama_model}")
    console.print(f"Service account: {cfg.service_account_file}")
    if not cfg.service_account_file.exists():
        console.print("[red]✗[/] Service account JSON not found")
        ok = False
    else:
        console.print("[green]✓[/] Service account JSON present")

    client = build_client(cfg)
    try:
        models = client.list_models()
        console.print(f"[green]✓[/] Ollama reachable. Models: {', '.join(models) or 'none'}")
        if cfg.ollama_model not in models and cfg.fallback_model not in models:
            console.print(
                f"[yellow]![/] Neither {cfg.ollama_model} nor {cfg.fallback_model} installed. "
                f"Run `ollama pull {cfg.ollama_model}`."
            )
            ok = False
    except OllamaError as e:
        console.print(f"[red]✗[/] Ollama: {e}")
        console.print("  Hint: run `ollama serve` in another terminal.")
        ok = False

    if ok:
        try:
            sc = SheetsClient(cfg)
            sc.connect()
            tabs = [ws.title for ws in sc.spreadsheet.worksheets()]
            console.print(f"[green]✓[/] Sheet opened. Tabs: {', '.join(tabs)}")
        except Exception as e:
            console.print(f"[red]✗[/] Sheets: {e}")
            ok = False

    sys.exit(0 if ok else 1)


@cli.command()
@click.pass_context
def init(ctx: click.Context) -> None:
    """Create the Sheet (if missing) and all required tabs."""
    cfg: Config = ctx.obj["cfg"]
    sc = SheetsClient(cfg)
    sc.connect()
    sc.ensure_tabs()
    url = sc.spreadsheet.url
    console.print(f"[green]✓[/] Sheet ready: {url}")
    console.print(
        "Share this Sheet with staff as needed. The service account is already an Editor."
    )


@cli.command()
@click.option("--file", "file_path", required=True, type=click.Path(exists=True))
@click.option("--since", type=str, default=None, help="YYYY-MM-DD")
@click.option("--until", type=str, default=None, help="YYYY-MM-DD")
@click.option("--dry-run", is_flag=True, default=False)
@click.pass_context
def ingest(
    ctx: click.Context,
    file_path: str,
    since: Optional[str],
    until: Optional[str],
    dry_run: bool,
) -> None:
    """Parse a WhatsApp export and append new leads to the Sheet."""
    cfg: Config = ctx.obj["cfg"]
    since_d = _parse_iso_date(since)
    until_d = _parse_iso_date(until)
    _run_ingest(cfg, Path(file_path), since_d, until_d, dry_run=dry_run)


@cli.command()
@click.option(
    "--input-dir",
    type=click.Path(exists=True, file_okay=False),
    required=True,
    help="Directory containing WhatsApp export files",
)
@click.pass_context
def daily(ctx: click.Context, input_dir: str) -> None:
    """Process the most recent export in input_dir for yesterday's messages."""
    cfg: Config = ctx.obj["cfg"]
    from datetime import timedelta

    d = Path(input_dir)
    exports = sorted(d.glob("*.txt"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not exports:
        console.print(f"[red]No .txt exports found in {d}[/]")
        sys.exit(1)
    latest = exports[0]
    yesterday = date.today() - timedelta(days=1)
    console.print(f"Daily: processing {latest.name} for {yesterday.isoformat()}")
    _run_ingest(cfg, latest, since=yesterday, until=yesterday, dry_run=False)


@cli.command()
@click.option("--since", type=str, required=True)
@click.option("--until", type=str, default=None)
@click.pass_context
def reprocess(ctx: click.Context, since: str, until: Optional[str]) -> None:
    """Re-run extraction over Raw_Messages rows in a date range (idempotent via dedupe)."""
    cfg: Config = ctx.obj["cfg"]
    since_d = _parse_iso_date(since)
    until_d = _parse_iso_date(until)

    sc = SheetsClient(cfg)
    sc.connect()
    sc.ensure_tabs()
    ws = sc.spreadsheet.worksheet("Raw_Messages")
    records = ws.get_all_values()[1:]
    rebuilt: list[Message] = []
    from datetime import time as _time

    for row in records:
        if len(row) < 5:
            continue
        msg_id, d_str, t_str, sender, body = row[0], row[1], row[2], row[3], row[4]
        try:
            d = datetime.strptime(d_str, "%Y-%m-%d").date()
        except ValueError:
            continue
        try:
            t = datetime.strptime(t_str, "%H:%M:%S").time()
        except ValueError:
            t = _time(0, 0)
        if since_d and d < since_d:
            continue
        if until_d and d > until_d:
            continue
        rebuilt.append(Message(msg_id=msg_id, date=d, time=t, sender=sender, body=body))

    console.print(f"Reprocessing {len(rebuilt)} raw messages")
    _extract_and_write(cfg, sc, rebuilt, dry_run=False, skip_raw_write=True)


def _run_ingest(
    cfg: Config,
    file_path: Path,
    since: date | None,
    until: date | None,
    dry_run: bool,
) -> None:
    console.print(f"Parsing {file_path}")
    all_msgs = parse_file(file_path)
    msgs = filter_non_system(all_msgs)
    msgs = filter_by_date(msgs, since=since, until=until)
    msgs = _filter_group(msgs, cfg.group_name_filter)
    console.print(
        f"Parsed {len(all_msgs)} lines → {len(msgs)} candidate messages "
        f"(since={since}, until={until})"
    )

    sc = SheetsClient(cfg)
    if not dry_run:
        sc.connect()
        sc.ensure_tabs()
    _extract_and_write(cfg, sc, msgs, dry_run=dry_run, skip_raw_write=False)


def _extract_and_write(
    cfg: Config,
    sc: SheetsClient,
    msgs: list[Message],
    dry_run: bool,
    skip_raw_write: bool,
) -> None:
    stats = RunStats(total_messages=len(msgs))
    client = build_client(cfg)
    try:
        client.ensure_ready()
    except OllamaError as e:
        console.print(f"[red]Ollama error:[/] {e}")
        sys.exit(2)

    existing: list[ExistingLead] = []
    known_raw_ids: set[str] = set()
    if not dry_run:
        existing = sc.load_existing_leads()
        known_raw_ids = sc.load_raw_message_ids()
    deduper = Deduper(existing)

    today_prefix = date.today().strftime("%Y%m%d")
    today_seq = sc.count_today(today_prefix) if not dry_run else 0

    preview_rows: list[LeadRow] = []
    raw_rows_to_append: list[list] = []
    processed_at = datetime.now().isoformat(timespec="seconds")

    for msg in msgs:
        if not classify(client, msg.body):
            stats.not_leads += 1
            if not dry_run and msg.msg_id not in known_raw_ids:
                raw_rows_to_append.append(
                    [msg.msg_id, msg.date_str, msg.time.strftime("%H:%M:%S"),
                     msg.sender, msg.body, processed_at, ""]
                )
                known_raw_ids.add(msg.msg_id)
            continue

        ext = extract(client, msg.body, failed_log=cfg.failed_extractions_path)
        if ext is None:
            stats.extraction_failures += 1
            if not dry_run and msg.msg_id not in known_raw_ids:
                raw_rows_to_append.append(
                    [msg.msg_id, msg.date_str, msg.time.strftime("%H:%M:%S"),
                     msg.sender, msg.body, processed_at, ""]
                )
                known_raw_ids.add(msg.msg_id)
            continue

        dup = deduper.check(ext.phone, ext.parent_name, ext.student_name)
        if dup.is_duplicate and dup.match is not None:
            stats.duplicates += 1
            note = f"Re-mentioned on {msg.date.isoformat()}: {msg.body[:120]}"
            if not dry_run:
                try:
                    sc.append_notes(dup.match, note)
                except Exception as e:
                    logger.warning("Failed to append note to %s: %s", dup.match.lead_id, e)
            logger.info("Duplicate (%s) for %r", dup.reason, msg.body[:60])
            if not dry_run and msg.msg_id not in known_raw_ids:
                raw_rows_to_append.append(
                    [msg.msg_id, msg.date_str, msg.time.strftime("%H:%M:%S"),
                     msg.sender, msg.body, processed_at, dup.match.lead_id]
                )
                known_raw_ids.add(msg.msg_id)
            continue

        today_seq += 1
        lead_id = f"LEAD-{today_prefix}-{today_seq:03d}"
        captured_at = datetime.now().isoformat(timespec="seconds")
        row = _build_lead_row(cfg, ext, msg, lead_id, captured_at)

        target_tab = "Review" if ext.confidence < cfg.review_confidence_threshold else "Leads"
        if target_tab == "Review":
            stats.low_confidence += 1
        else:
            stats.new_leads += 1

        preview_rows.append(row)

        if not dry_run:
            sc.append_lead(target_tab, row)
            deduper.register(
                ExistingLead(
                    row_index=-1,
                    tab=target_tab,
                    lead_id=lead_id,
                    phone=row.phone,
                    parent_name=row.parent_name,
                    student_name=row.student_name,
                    notes=row.notes,
                )
            )
            if msg.msg_id not in known_raw_ids:
                raw_rows_to_append.append(
                    [msg.msg_id, msg.date_str, msg.time.strftime("%H:%M:%S"),
                     msg.sender, msg.body, processed_at, lead_id]
                )
                known_raw_ids.add(msg.msg_id)

    if not dry_run and not skip_raw_write and raw_rows_to_append:
        sc.append_raw_messages(raw_rows_to_append)

    console.print(stats.table())
    lat = client.latency_stats()
    console.print(
        f"Ollama: {lat['count']} calls, avg {lat['avg']:.2f}s, max {lat['max']:.2f}s"
    )

    if preview_rows:
        t = Table(title="Leads (preview)" if dry_run else "Leads added")
        for c in ("lead_id", "parent", "student", "class", "phone", "conf", "tab"):
            t.add_column(c)
        for r in preview_rows[:20]:
            tab = "Review" if r.confidence < cfg.review_confidence_threshold else "Leads"
            t.add_row(
                r.lead_id, r.parent_name, r.student_name, r.class_,
                r.phone, f"{r.confidence:.2f}", tab,
            )
        console.print(t)

    # Guard against prompt-tuning regressions: warn if >20% go to Review.
    total_new = stats.new_leads + stats.low_confidence
    if total_new >= 5 and stats.low_confidence / total_new > 0.2:
        console.print(
            f"[yellow]![/] {stats.low_confidence}/{total_new} leads landed in Review. "
            "Consider sharing 5 misclassified examples so the prompt can be tuned."
        )
