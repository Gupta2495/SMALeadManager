"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { editLeadAction } from "./actions";
import { INTERESTS, type Lead } from "@/lib/types";

export function EditLeadForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  const isDraftPhone = lead.phone.startsWith("NOPHONE-");

  function onSubmit(form: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await editLeadAction(lead.id, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/leads/${lead.id}`);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="form-row">
        <label className="label" htmlFor="student_name">Student name</label>
        <input
          id="student_name"
          name="student_name"
          className="input"
          defaultValue={lead.student_name ?? ""}
        />
      </div>

      <div className="form-row">
        <label className="label" htmlFor="parent_name">Parent / guardian name</label>
        <input
          id="parent_name"
          name="parent_name"
          className="input"
          defaultValue={lead.parent_name ?? ""}
        />
      </div>

      <div className="form-row">
        <label className="label" htmlFor="phone">
          Phone{isDraftPhone ? " — currently missing" : ""}
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="+91 98765 43210"
          className="input"
          defaultValue={isDraftPhone ? "" : lead.phone}
        />
        {isDraftPhone ? (
          <p style={{ fontSize: 12, color: "var(--n400)", marginTop: 4 }}>
            No phone was captured. Add it here or leave blank to keep as draft.
          </p>
        ) : null}
      </div>

      <div className="form-row">
        <label className="label" htmlFor="class_label">Class</label>
        <input
          id="class_label"
          name="class_label"
          className="input"
          placeholder="e.g. 6th, Nursery, 11th PCM"
          defaultValue={lead.class_label ?? ""}
          list="class-options"
        />
        <datalist id="class-options">
          {["Nursery","LKG","UKG","1st","2nd","3rd","4th","5th","6th","7th","8th","9th","10th","11th","12th"].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div className="form-row">
        <label className="label" htmlFor="interest">Interest</label>
        <select
          id="interest"
          name="interest"
          className="select"
          defaultValue={lead.interest ?? ""}
        >
          <option value="">—</option>
          {INTERESTS.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label className="label" htmlFor="location">Village / city</label>
        <input
          id="location"
          name="location"
          className="input"
          defaultValue={lead.location ?? ""}
        />
      </div>

      <div className="form-row">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          name="notes"
          className="textarea"
          defaultValue={lead.notes ?? ""}
          rows={3}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-lg"
          style={{ flex: 1 }}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          onClick={() => router.back()}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
