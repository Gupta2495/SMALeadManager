# Future enhancements — intentionally out of scope for MVP

Nothing here is scheduled. These are noted so we don't forget and don't
accidentally scope-creep the MVP.

## Phase 2 candidates

- **SMS / WhatsApp notifications to the caller** when a new lead is added
  (e.g. via Twilio free tier or a personal WhatsApp API account).
- **Email digest** at 9:05 AM: "You have N new leads today, M due for
  follow-up."
- **Multi-group support.** Today the tool assumes one staff group. If the
  school adds regional groups, parse each into the same Sheet with a
  `source_group` column.
- **Analytics dashboard.** Beyond per-run logs:
  - Conversion funnel (new → contacted → visited → admitted)
  - Caller productivity
  - Lead source (which director posted it) performance
- **Real-time listening.** Either (a) WhatsApp Web via Playwright headful
  session, or (b) official WhatsApp Business API. Both carry operational
  cost and fragility — the batch model is deliberate.
- **Auto-followup reminder bot.** If `next_follow_up` is today and the lead
  is still `new`, ping the caller in a second WhatsApp group.
- **Prompt self-tuning.** Collect a few weeks of `Review`-tab corrections,
  then feed them as few-shot examples into `extractor.txt` automatically.

## Explicitly rejected

- Cloud hosting. Defeats the zero-cost constraint.
- SaaS CRMs. Same.
- Any database other than the Google Sheet. The caller already knows Sheets.
