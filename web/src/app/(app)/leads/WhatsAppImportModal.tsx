"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { importWhatsAppLeadsAction } from "./import-actions";

function todayIST(): string {
  // Returns YYYY-MM-DD in IST
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

function fmtDateForPrompt(isoDate: string): string {
  // "2026-04-14" → "14 Apr 2026"
  const [y, m, d] = isoDate.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function buildPrompt(date: string): string {
  const label = date ? fmtDateForPrompt(date) : "{DATE}";
  return `You are a lead extraction assistant for Shree Madhav Academy, a school in Mandsaur, Madhya Pradesh, India.

Extract all prospective student enquiries from the WhatsApp chat history below.
ONLY include messages dated ${label} or later — ignore everything before this date.

For each lead, return one JSON object with exactly these keys:
  student_name  – student's name, or null
  parent_name   – parent/guardian name, or null
  phone         – 10-digit Indian mobile number, digits only, or null
  class_label   – class e.g. "5th", "11th Agri", "LKG", "Nursery", or null
  location      – village/town/city the family is from, or null
  notes         – extra info (hostel interest, sibling of X, form issued…), or null
  source_from   – the WhatsApp sender who mentioned this lead
  source_date   – date of the message, format YYYY-MM-DD

Rules:
- Create a separate object for each student (siblings get their own entry; note the relationship in "notes").
- Use null when information is not available — do not guess.
- Return ONLY a valid JSON array. No markdown, no explanation, no code fences.

Example:
[
  {
    "student_name": "Rahul Sharma",
    "parent_name": "Rajesh Sharma",
    "phone": "9876543210",
    "class_label": "8th",
    "location": "Mandsaur",
    "notes": "Hostel interest",
    "source_from": "Papa",
    "source_date": "${date}"
  }
]

WhatsApp chat history (paste below):`;
}

export function WhatsAppImportModal() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayIST);
  const [json, setJson] = useState("");
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{ ok: true; imported: number; skipped: { index: number; reason: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  function close() {
    setOpen(false);
    setJson("");
    setResult(null);
    setError(null);
  }

  function onBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) close();
  }

  function onCopy() {
    navigator.clipboard.writeText(buildPrompt(date)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function onImport() {
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await importWhatsAppLeadsAction(json.trim());
      if (res.ok) {
        setResult(res);
        setJson("");
      } else {
        setError(res.error);
      }
    });
  }

  const prompt = buildPrompt(date);

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => setOpen(true)}>
        Import WhatsApp
      </button>

      {open &&
        createPortal(
          <div
            className="modal-backdrop"
            ref={backdropRef}
            onClick={onBackdropClick}
          >
            <div className="modal" style={{ maxWidth: 620 }}>
              <div className="modal-header">
                <span style={{ fontWeight: 700, fontSize: 16 }}>Import WhatsApp leads</span>
              </div>

              {/* Section A — Generate prompt */}
              <div className="form-row">
                <label className="label" htmlFor="wa-import-date">
                  Import leads from date
                </label>
                <input
                  id="wa-import-date"
                  type="date"
                  className="input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ maxWidth: 200 }}
                />
              </div>

              <div className="form-row">
                <label className="label">LLM prompt</label>
                <textarea
                  readOnly
                  className="input"
                  value={prompt}
                  rows={6}
                  style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
                />
                <div style={{ marginTop: 6 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onCopy}>
                    {copied ? "Copied!" : "Copy prompt"}
                  </button>
                </div>
              </div>

              {/* Divider */}
              <hr style={{ border: "none", borderTop: "1px solid var(--n200)", margin: "4px 0 16px" }} />

              {/* Section B — Paste JSON */}
              <div className="form-row">
                <label className="label" htmlFor="wa-import-json">
                  Paste JSON from LLM
                </label>
                <textarea
                  id="wa-import-json"
                  className="input"
                  value={json}
                  onChange={(e) => setJson(e.target.value)}
                  rows={8}
                  placeholder={'[\n  { "student_name": "...", "phone": "...", ... }\n]'}
                  style={{ fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
                />
              </div>

              {result && (
                <p style={{ color: "var(--green-700, #15803d)", marginBottom: 12, fontSize: 14 }}>
                  Imported {result.imported} lead{result.imported !== 1 ? "s" : ""} into the review queue
                  {result.skipped.length > 0 ? ` (${result.skipped.length} skipped)` : "."}
                </p>
              )}

              {error && (
                <p style={{ color: "#991B1B", marginBottom: 12, fontSize: 14 }}>{error}</p>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={close}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onImport}
                  disabled={isPending || !json.trim()}
                >
                  {isPending ? "Importing…" : "Import leads"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
