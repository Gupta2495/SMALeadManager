import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusChip } from "./StatusChip";
import { fmtDate, followUpState } from "@/lib/date";
import type { Lead } from "@/lib/types";

export function LeadCard({ lead }: { lead: Lead }) {
  const state = followUpState(lead.next_follow_up);

  return (
    <Link href={`/leads/${lead.id}`} className="card lead-card">
      <div className="lead-card-main">
        <div className="lead-name">
          {lead.student_name || "Unknown student"}
          {lead.parent_name ? (
            <span className="text-[13px] font-normal text-[color:var(--n500)]">
              · {lead.parent_name}
            </span>
          ) : null}
        </div>
        <div className="lead-meta">
          <span>{lead.class_label ? `Class ${lead.class_label}` : "—"}</span>
          <span className="sep">·</span>
          <span>{lead.interest || "—"}</span>
          {lead.location ? (
            <>
              <span className="sep">·</span>
              <span>{lead.location}</span>
            </>
          ) : null}
        </div>
        <div className="lead-sub">
          <span>Captured {fmtDate(lead.captured_at, { relative: true })}</span>
          {state ? (
            <>
              <span className="sep">·</span>
              <span>{state.label}</span>
            </>
          ) : null}
        </div>
        <div className="lead-chips">
          <StatusChip status={lead.status} />
          {state?.kind === "overdue" ? <span className="chip chip-overdue">Overdue</span> : null}
          {state?.kind === "due" ? <span className="chip chip-due">Due today</span> : null}
        </div>
      </div>
      <ChevronRight className="lead-caret" size={20} aria-hidden />
    </Link>
  );
}
