"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeLeadAction, logCallAction } from "./actions";
import { suggestNextFollowUp, toDateTimeLocal } from "@/lib/followUpSuggester";
import { CALL_OUTCOMES, OUTCOME_LABELS, type CallOutcome, type LeadStatus } from "@/lib/types";

const CLOSE_OUTCOMES: CallOutcome[] = ["admitted", "lost", "not_interested"];

export function CallLogForm({
  leadId,
  confidence,
  followUpCount,
}: {
  leadId: string;
  confidence: number | null;
  followUpCount: number;
}) {
  const router = useRouter();
  const [outcome, setOutcome] = useState<CallOutcome | null>(null);
  const [notes, setNotes] = useState("");
  const [nextFU, setNextFU] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const [confirm, setConfirm] = useState<
    "admitted" | "lost" | "on_hold" | "close-outcome" | null
  >(null);

  function pickOutcome(id: CallOutcome) {
    setOutcome(id);
    const suggested = suggestNextFollowUp(id);
    setNextFU(suggested ? toDateTimeLocal(suggested) : "");
  }

  function submit(closeAs: LeadStatus | null = null) {
    if (!outcome) {
      setError("Pick an outcome first.");
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const iso = nextFU ? new Date(nextFU).toISOString() : null;
      const result = await logCallAction({
        leadId,
        outcome,
        notes,
        nextFollowUp: iso,
        closeAs,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (closeAs || CLOSE_OUTCOMES.includes(outcome)) {
        router.replace("/");
      } else {
        setOutcome(null);
        setNotes("");
        setNextFU("");
        router.refresh();
      }
    });
  }

  function doClose(status: "admitted" | "lost" | "on_hold") {
    startTransition(async () => {
      const result = await closeLeadAction(leadId, status);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/");
    });
  }

  function onSave() {
    if (!outcome) {
      setError("Pick an outcome first.");
      return;
    }
    if (CLOSE_OUTCOMES.includes(outcome)) {
      setConfirm("close-outcome");
      return;
    }
    submit(null);
  }

  const confidenceLabel =
    confidence !== null ? `${Math.round(confidence * 100)}%` : "—";

  return (
    <div className="call-form-card">
      <h3>Log this call</h3>

      <div className="form-row">
        <div className="label">Outcome</div>
        <div className="radio-grid">
          {CALL_OUTCOMES.map((id) => (
            <button
              type="button"
              key={id}
              className={`radio-option ${outcome === id ? "selected" : ""}`}
              onClick={() => pickOutcome(id)}
            >
              <span className="bullet" />
              {OUTCOME_LABELS[id]}
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
            disabled={outcome ? CLOSE_OUTCOMES.includes(outcome) : false}
          />
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setNextFU("")}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="form-row">
        <div className="label">Notes</div>
        <textarea
          className="textarea"
          placeholder="What did they say? Key concerns, next step…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button
        type="button"
        className="btn btn-primary btn-block btn-lg"
        onClick={onSave}
        disabled={pending}
      >
        {pending ? "Saving…" : "Save call log"}
      </button>

      <div className="close-actions">
        <button
          type="button"
          className="btn btn-success-outline"
          onClick={() => setConfirm("admitted")}
        >
          Close as Admitted
        </button>
        <button
          type="button"
          className="btn btn-danger-outline"
          onClick={() => setConfirm("lost")}
        >
          Close as Lost
        </button>
        <button
          type="button"
          className="btn btn-muted-outline"
          onClick={() => setConfirm("on_hold")}
        >
          Put on hold
        </button>
      </div>

      <div className="meta-block">
        <span>
          Follow-ups: <strong>{followUpCount}</strong>
        </span>
        <span>
          Confidence: <strong>{confidenceLabel}</strong>
        </span>
      </div>

      {confirm ? (
        <ConfirmDialog
          kind={confirm}
          outcome={outcome}
          onCancel={() => setConfirm(null)}
          onConfirm={() => {
            if (confirm === "close-outcome") {
              submit((outcome as LeadStatus) ?? null);
            } else {
              doClose(confirm);
            }
            setConfirm(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ConfirmDialog({
  kind,
  outcome,
  onCancel,
  onConfirm,
}: {
  kind: "admitted" | "lost" | "on_hold" | "close-outcome";
  outcome: CallOutcome | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const title =
    kind === "admitted"
      ? "Mark as admitted?"
      : kind === "lost"
        ? "Mark as lost?"
        : kind === "on_hold"
          ? "Put on hold?"
          : `Close this lead as ${outcome ? OUTCOME_LABELS[outcome] : ""}?`;
  const body =
    kind === "admitted"
      ? "This closes the lead and removes it from your active queue. You can still find it in All leads."
      : kind === "lost"
        ? "This lead is marked lost. You can reopen it later from All leads."
        : kind === "on_hold"
          ? "The lead is paused — no follow-ups will be scheduled until you reactivate it."
          : "Based on the outcome, this closes the lead and removes it from Today.";

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
