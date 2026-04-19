"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStatusAction } from "./actions";
import { LEAD_STATUSES, STATUS_META, type LeadStatus } from "@/lib/types";

export function StatusSelect({
  leadId,
  initial,
}: {
  leadId: string;
  initial: LeadStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<LeadStatus>(initial);
  const [, startTransition] = useTransition();

  return (
    <select
      className="select"
      value={value}
      style={{
        marginTop: 2,
        padding: "8px 36px 8px 12px",
        minHeight: 36,
        fontSize: 13,
        fontWeight: 600,
      }}
      onChange={(e) => {
        const next = e.target.value as LeadStatus;
        setValue(next);
        startTransition(async () => {
          const result = await updateStatusAction(leadId, next);
          if (!result.ok) {
            setValue(initial);
            alert(result.error);
          } else {
            router.refresh();
          }
        });
      }}
    >
      {LEAD_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}
