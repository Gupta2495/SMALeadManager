# Setup Guide — Shree Madhav Lead Tracker

This is a one-laptop, zero-cost tool. Follow these steps in order.

## 1. Install Ollama and pull a model

Ollama is already on the machine. Pull the primary model (one-time, ~5 GB):

```bash
ollama pull llama3.1:8b
# If RAM is tight, also pull the fallback:
ollama pull llama3.2:3b
```

Make sure `ollama serve` is running (the macOS app handles this automatically).

## 2. Google Cloud project (free tier)

1. Go to <https://console.cloud.google.com> and create a new project
   (e.g. `madhav-lead-tracker`).
2. **APIs & Services → Enable APIs**: enable
   - Google Sheets API
   - Google Drive API
3. **IAM & Admin → Service Accounts → Create**. Name it `lead-tracker-bot`.
4. On that service account → **Keys → Add key → JSON**. Download the file.
5. Save it to:
   ```
   ~/.config/lead_tracker/service_account.json
   ```
6. Copy the service account email
   (`lead-tracker-bot@<project>.iam.gserviceaccount.com`).
7. Create an empty Google Sheet named exactly **Madhav Admissions Leads**
   (or match whatever you put in `config.yaml`) and share it with that
   service account email as **Editor**.

> `python -m lead_tracker init` will create the required tabs
> (`Leads`, `Review`, `Follow_ups`, `Raw_Messages`) inside that Sheet.

## 3. Install the Python package

```bash
cd ~/shree-madhav-lead-tracker
python3 -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
```

## 4. Config file

Create `~/.config/lead_tracker/config.yaml` (copy from `config.example.yaml`):

```yaml
sheet_name: "Madhav Admissions Leads"
ollama_url: "http://localhost:11434"
ollama_model: "llama3.1:8b"
fallback_model: "llama3.2:3b"
default_assignee: "Admissions"
timezone: "Asia/Kolkata"
batch_size: 15
review_confidence_threshold: 0.7
service_account_path: "~/.config/lead_tracker/service_account.json"
logs_dir: "./logs"
failed_extractions_log: "./logs/failed_extractions.log"
```

## 5. Export a WhatsApp chat

1. Open the staff group in WhatsApp.
2. Menu → More → **Export chat** → **Without media**.
3. Share the `.txt` to your Mac (email, AirDrop, or Google Drive).
4. Save it under `~/whatsapp_exports/YYYY-MM-DD.txt`.

## 6. First run

```bash
# Check everything is wired up
python -m lead_tracker doctor

# Create the Sheet tabs
python -m lead_tracker init

# Dry run first — writes nothing
python -m lead_tracker ingest --file ~/whatsapp_exports/first_export.txt --dry-run

# If the preview looks right, run it for real:
python -m lead_tracker ingest --file ~/whatsapp_exports/first_export.txt
```

## 7. Daily automation (macOS launchd)

1. Copy the provided plist into your LaunchAgents folder:
   ```bash
   cp launchd/com.nikhilesh.leadtracker.plist ~/Library/LaunchAgents/
   ```
2. Edit the paths inside the plist if your install location differs from
   `/Users/nikhileshgupta/shree-madhav-lead-tracker`.
3. Load it:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.nikhilesh.leadtracker.plist
   ```
4. Every morning, drop yesterday's export as `~/whatsapp_exports/*.txt`.
   The job fires at 9:00 AM IST and processes the most recent file.

To stop it: `launchctl unload ~/Library/LaunchAgents/com.nikhilesh.leadtracker.plist`.

## 8. Backfilling a date range

```bash
python -m lead_tracker ingest \
    --file ~/whatsapp_exports/full_history.txt \
    --since 2026-01-01 --until 2026-04-17
```

Dedup is automatic — running it twice is safe.

## 9. Reprocessing after prompt tuning

```bash
python -m lead_tracker reprocess --since 2026-01-01
```

This re-runs extraction over rows already in `Raw_Messages` so you never
lose a message just because the first-pass prompt missed it.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Ollama not reachable` | Run `ollama serve` or open the Ollama app |
| `Neither llama3.1:8b nor llama3.2:3b installed` | `ollama pull llama3.1:8b` |
| `Service account JSON not found` | Re-check step 2.5 path |
| `APIError: The caller does not have permission` | Share the Sheet with the service-account email as Editor |
| `>20% leads landed in Review` | Share 5 misclassified examples; prompt needs tuning |
