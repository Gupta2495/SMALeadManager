"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLeadAction } from "./actions";
import { CLASSES, INTERESTS } from "@/lib/types";

export function NewLeadForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function onSubmit(form: FormData) {
    setError(undefined);
    startTransition(async () => {
      const result = await createLeadAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/leads/${result.leadId}`);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-4">
      <div className="form-row">
        <label className="label" htmlFor="student_name">Student name</label>
        <input id="student_name" name="student_name" required className="input" />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="parent_name">Parent name</label>
        <input id="parent_name" name="parent_name" className="input" />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          inputMode="tel"
          placeholder="+91 98765 43210"
          className="input"
        />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="class_label">Class</label>
        <select id="class_label" name="class_label" className="select" defaultValue="">
          <option value="">—</option>
          {CLASSES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="label" htmlFor="interest">Interest</label>
        <select id="interest" name="interest" className="select" defaultValue="">
          <option value="">—</option>
          {INTERESTS.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="label" htmlFor="location">Location</label>
        <input id="location" name="location" className="input" />
      </div>
      <div className="form-row">
        <label className="label" htmlFor="source_msg_date">Source date</label>
        <input
          id="source_msg_date"
          name="source_msg_date"
          type="date"
          className="input"
        />
        <p className="hint">Optional — add the original source date for manual entries.</p>
      </div>
      <div className="form-row">
        <label className="label" htmlFor="notes">Notes</label>
        <textarea id="notes" name="notes" className="textarea" />
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" disabled={pending} className="btn btn-primary btn-block btn-lg">
        {pending ? "Creating…" : "Create lead"}
      </button>
    </form>
  );
}
