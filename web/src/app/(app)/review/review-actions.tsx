"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  discardFromReviewAction,
  promoteFromReviewAction,
} from "./actions";

export function ReviewActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="review-actions">
      <button
        type="button"
        className="btn btn-success-outline btn-sm"
        disabled={pending}
        onClick={() => run(() => promoteFromReviewAction(leadId))}
      >
        Promote
      </button>
      <button
        type="button"
        className="btn btn-danger-outline btn-sm"
        disabled={pending}
        onClick={() => run(() => discardFromReviewAction(leadId))}
      >
        Discard
      </button>
    </div>
  );
}
