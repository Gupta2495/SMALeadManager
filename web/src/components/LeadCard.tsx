import Link from "next/link";
import { ChevronRight, Pencil } from "lucide-react";
import { StatusChip } from "./StatusChip";
import { fmtDate, followUpState } from "@/lib/date";
import type { Lead } from "@/lib/types";

export function LeadCard({ lead }: { lead: Lead }) {
  const state = followUpState(lead.next_follow_up);

  return (
    <div className="card lead-card" style={{ display: "flex", alignItems: "stretch" }}>
      <Link href={`/leads/${lead.id}`} className="lead-card-main" style={{ flex: 1, textDecoration: "none", color: "inherit" }}>
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
          {lead.source_msg_date ? (
            <>
              <span className="sep">·</span>
              <span>Source {fmtDate(lead.source_msg_date)}</span>
            </>
          ) : null}
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
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: 4, paddingRight: 8 }}>
        <Link
          href={`/leads/${lead.id}/edit`}
          className="btn btn-ghost"
          aria-label={`Edit ${lead.student_name ?? "lead"}`}
          style={{ padding: "6px 8px" }}
        >
          <Pencil size={15} aria-hidden />
        </Link>
        <ChevronRight className="lead-caret" size={20} aria-hidden />
      </div>
    </div>
  );
}
