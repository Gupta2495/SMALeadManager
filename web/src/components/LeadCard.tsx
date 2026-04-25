"use client";

import Link from "next/link";
import { ChevronRight, MessageCircle, Pencil, Phone } from "lucide-react";
import { DeleteLeadButton } from "./DeleteLeadButton";
import { QuickStatusSelect } from "./QuickStatusSelect";
import { fmtDate, followUpState } from "@/lib/date";
import { formatPhoneDisplay, telHref, whatsappHref } from "@/lib/phoneFormat";
import type { Lead } from "@/lib/types";

export function LeadCard({ lead }: { lead: Lead }) {
  const state = followUpState(lead.next_follow_up);
  const hasDraftPhone = lead.phone.startsWith("NOPHONE-");

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
          <span>{hasDraftPhone ? "Phone missing" : formatPhoneDisplay(lead.phone)}</span>
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
        {(state?.kind === "overdue" || state?.kind === "due") ? (
          <div className="lead-chips">
            {state?.kind === "overdue" ? <span className="chip chip-overdue">Overdue</span> : null}
            {state?.kind === "due" ? <span className="chip chip-due">Due today</span> : null}
          </div>
        ) : null}
      </Link>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingRight: 8,
          paddingLeft: 12,
          flexWrap: "wrap",
          justifyContent: "flex-end",
          minWidth: 280,
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <QuickStatusSelect key={`${lead.id}-${lead.status}`} leadId={lead.id} initial={lead.status} />
        {!hasDraftPhone ? (
          <>
            <a
              href={telHref(lead.phone)}
              className="btn btn-primary btn-sm"
              aria-label={`Call ${lead.student_name ?? lead.parent_name ?? "lead"}`}
            >
              <Phone size={16} aria-hidden /> Call
            </a>
            <a
              href={whatsappHref(lead.phone)}
              className="btn btn-success btn-sm"
              target="_blank"
              rel="noreferrer"
              aria-label={`WhatsApp ${lead.student_name ?? lead.parent_name ?? "lead"}`}
            >
              <MessageCircle size={16} aria-hidden /> WhatsApp
            </a>
          </>
        ) : null}
        <Link
          href={`/leads/${lead.id}/edit`}
          className="btn btn-ghost"
          aria-label={`Edit ${lead.student_name ?? "lead"}`}
          style={{ padding: "6px 8px" }}
        >
          <Pencil size={15} aria-hidden />
        </Link>
        <DeleteLeadButton leadId={lead.id} />
        <ChevronRight className="lead-caret" size={20} aria-hidden />
      </div>
    </div>
  );
}
