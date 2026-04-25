"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteLeadAction } from "@/app/(app)/leads/actions";

export function DeleteLeadButton({
  leadId,
  redirectTo,
}: {
  leadId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteLeadAction(leadId);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });
  }

  if (isPending) {
    return (
      <button type="button" className="btn btn-danger-outline btn-sm" disabled>
        Deleting…
      </button>
    );
  }

  if (confirming) {
    return (
      <span className="btn-row">
        <button type="button" className="btn btn-danger-outline btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(); }}>
          Confirm
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={(e) => { e.stopPropagation(); setConfirming(false); setError(null); }}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-danger-outline btn-sm"
        onClick={(e) => { e.stopPropagation(); setConfirming(true); setError(null); }}
      >
        Delete
      </button>
      {error ? <span className="inline-error">{error}</span> : null}
    </>
  );
}
