# Shree Madhav Lead Tracker

Local, zero-cost admissions lead tracker for Shree Madhav Academy, Mandsaur.

WhatsApp staff-group exports → local LLM extraction (Ollama) → Google Sheet
that the admissions caller works from. Runs once a day on the director's
laptop; no paid APIs, no hosting, no subscriptions.

```
WhatsApp export (.txt)
      ↓  parser.py
 normalized messages
      ↓  extractor.py  (Ollama: llama3.1:8b, format=json)
 structured lead JSON
      ↓  deduper.py    (phone match + parent/student name match)
 new leads only
      ↓  sheets.py     (gspread + service account)
 Google Sheet: Leads / Review / Follow_ups / Raw_Messages
```

## Commands

```bash
python -m lead_tracker init           # create Sheet tabs
python -m lead_tracker doctor         # check Ollama + Sheets + config
python -m lead_tracker ingest --file EXPORT.txt [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--dry-run]
python -m lead_tracker daily --input-dir ~/whatsapp_exports/
python -m lead_tracker reprocess --since YYYY-MM-DD [--until YYYY-MM-DD]
```

## First time here?

See **[SETUP.md](SETUP.md)** for the full step-by-step: Ollama model, Google
Cloud project, service account, config file, first run, and launchd
automation.

## Project layout

```
lead_tracker/
├── cli.py              CLI (click)
├── parser.py           WhatsApp export → Message objects
├── normalizer.py       Phone / name / id helpers
├── extractor.py        Ollama client + classify + extract
├── deduper.py          Phone + name dedupe
├── sheets.py           gspread wrapper, tab management
├── config.py           YAML + env loader
├── logging_setup.py    Per-run log files
└── prompts/
    ├── classifier.txt
    └── extractor.txt
tests/
├── test_parser.py
├── test_normalizer.py
├── test_deduper.py
├── test_extractor.py
└── fixtures/
launchd/
└── com.nikhilesh.leadtracker.plist
```

## Running tests

```bash
pip install -e '.[dev]'
pytest -q
```

## Design notes

- **Batch, not real-time.** One cron run per day; the caller works the
  Sheet throughout the day.
- **Idempotent.** Raw messages are keyed by `sha1(date|time|sender|body)`;
  leads are deduped by normalized phone or by parent+student name pair.
  Running the same export twice is a no-op.
- **Never silently drops.** Every message ends up in `Leads`, `Review`,
  `Raw_Messages`, or `failed_extractions.log`.
- **Low-confidence extractions** (<0.7) go to the `Review` tab for the
  caller to promote or delete.
- **Google Sheets is the UI.** No web app. Status, follow-ups, and outcome
  are driven by Apps Script on top of the Sheet.

## Out of scope (for now)

See **[FUTURE.md](FUTURE.md)**: real-time listener, SMS notifications,
multi-group, analytics dashboard.
