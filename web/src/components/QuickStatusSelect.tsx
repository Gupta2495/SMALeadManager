"use client";

import { startTransition, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { logCallAction } from "@/app/(app)/leads/[id]/actions";
import { suggestNextFollowUp, toDateTimeLocal } from "@/lib/followUpSuggester";
import {
  LEAD_STATUSES,
  STATUS_META,
  CALL_OUTCOMES,
  OUTCOME_LABELS,
  type LeadStatus,
  type CallOutcome,
} from "@/lib/types";

const CLOSE_OUTCOMES: CallOutcome[] = ["admitted", "lost", "not_interested"];

const STATUS_DEFAULT_OUTCOME: Record<LeadStatus, CallOutcome> = {
  new:              "callback_requested",
  to_be_contacted:  "callback_requested",
  contacted:        "callback_requested",
  interested:       "interested",
  visited:          "visit_scheduled",
  on_hold:          "callback_requested",
  admitted:         "admitted",
  rejected:         "not_interested",
  lost:             "lost",
};

export function QuickStatusSelect({
  leadId,
  initial,
}: {
  leadId: string;
  initial: LeadStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<LeadStatus>(initial);
  const [pendingStatus, setPendingStatus] = useState<LeadStatus | null>(null);
  const meta = STATUS_META[value];

  return (
    <span
      style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <select
        className="status-select"
        value={value}
        aria-label="Change lead status"
        style={{ background: meta.bg, color: meta.fg }}
        onChange={(e) => {
          const next = e.target.value as LeadStatus;
          if (next !== value) setPendingStatus(next);
        }}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>

      {pendingStatus ? (
        <StatusChangeModal
          key={`${leadId}-${pendingStatus}`}
          leadId={leadId}
          toStatus={pendingStatus}
          onClose={() => setPendingStatus(null)}
          onSaved={(savedStatus) => {
            setValue(savedStatus);
            setPendingStatus(null);
            startTransition(() => {
              router.refresh();
            });
          }}
        />
      ) : null}
    </span>
  );
}

function StatusChangeModal({
  leadId,
  toStatus,
  onClose,
  onSaved,
}: {
  leadId: string;
  toStatus: LeadStatus;
  onClose: () => void;
  onSaved: (savedStatus: LeadStatus) => void;
}) {
  const defaultOutcome = STATUS_DEFAULT_OUTCOME[toStatus];
  const [outcome, setOutcome] = useState<CallOutcome>(defaultOutcome);
  const [notes, setNotes] = useState("");
  const [nextFU, setNextFU] = useState<string>(() => {
    const suggested = suggestNextFollowUp(defaultOutcome);
    return suggested ? toDateTimeLocal(suggested) : "";
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isPending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isPending, onClose]);

  function pickOutcome(o: CallOutcome) {
    setOutcome(o);
    const suggested = suggestNextFollowUp(o);
    setNextFU(suggested ? toDateTimeLocal(suggested) : "");
  }

  function handleSave() {
    startTransition(async () => {
      const result = await logCallAction({
        leadId,
        outcome,
        notes,
        nextFollowUp: nextFU ? new Date(nextFU).toISOString() : null,
        closeAs: toStatus,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(toStatus);
    });
  }

  const toMeta = STATUS_META[toStatus];

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Mark as</h3>
          <span className="chip" style={{ background: toMeta.bg, color: toMeta.fg }}>
            {toMeta.label}
          </span>
        </div>

        <div className="form-row">
          <div className="label">Outcome</div>
          <div className="radio-grid">
            {CALL_OUTCOMES.map((o) => (
              <button
                type="button"
                key={o}
                className={`radio-option${outcome === o ? " selected" : ""}`}
                onClick={() => pickOutcome(o)}
              >
                <span className="bullet" />
                {OUTCOME_LABELS[o]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="label">Next follow-up</div>
          <div className="form-row-inline">
            <input
              className="input"
              type="datetime-local"
              value={nextFU}
              onChange={(e) => setNextFU(e.target.value)}
              disabled={CLOSE_OUTCOMES.includes(outcome)}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setNextFU("")}
              disabled={CLOSE_OUTCOMES.includes(outcome)}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="form-row">
          <div className="label">Notes</div>
          <textarea
            className="textarea"
            placeholder="What did they say? Any key details…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? "Saving…" : "Save log"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
