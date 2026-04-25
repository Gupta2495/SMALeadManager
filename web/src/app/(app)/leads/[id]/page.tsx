import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronRight, MessageCircle, Pencil, Phone } from "lucide-react";
import { DeleteLeadButton } from "@/components/DeleteLeadButton";
import { fmtDate, fmtTime, followUpState } from "@/lib/date";
import { formatPhoneDisplay, telHref, whatsappHref } from "@/lib/phoneFormat";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { OUTCOME_LABELS, type Lead } from "@/lib/types";
import { StatusSelect } from "./status-select";
import { CallLogForm } from "./call-log-form";

type InteractionHistory = {
  id: string;
  type: string;
  outcome: keyof typeof OUTCOME_LABELS | null;
  notes: string | null;
  created_at: string;
  creator: {
    full_name: string | null;
    email: string | null;
  } | null;
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getCurrentProfile();

  const [{ data: lead }, { data: interactions }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).single<Lead>(),
    supabase
      .from("interactions")
      .select("id, type, outcome, notes, created_at, creator:profiles!interactions_created_by_fkey(full_name, email)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .returns<InteractionHistory[]>(),
  ]);

  if (!lead) notFound();

  const state = followUpState(lead.next_follow_up);
  const history = interactions ?? [];

  return (
    <>
      <Link href="/" className="back-link">
        <ArrowLeft size={16} aria-hidden /> Back to Today
      </Link>

      <div className="detail-grid">
        <div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h1 className="detail-title">{lead.student_name ?? "Unknown"}</h1>
              <div className="detail-subtitle">
                {lead.parent_name ?? "—"} · {formatPhoneDisplay(lead.phone)}
              </div>
            </div>
            <div className="btn-row">
              <Link href={`/leads/${lead.id}/edit`} className="btn btn-secondary btn-sm">
                <Pencil size={15} aria-hidden /> Edit
              </Link>
              <DeleteLeadButton leadId={lead.id} redirectTo="/leads" />
            </div>
          </div>

          <div className="detail-actions">
            <a className="btn btn-primary btn-lg" href={telHref(lead.phone)}>
              <Phone size={18} aria-hidden /> Call
            </a>
            <a
              className="btn btn-success btn-lg"
              href={whatsappHref(lead.phone)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} aria-hidden /> WhatsApp
            </a>
          </div>

          <div className="info-grid">
            <Info label="Class" value={lead.class_label} />
            <Info label="Interest" value={lead.interest} />
            <Info label="Location" value={lead.location} />
            <Info
              label="Captured"
              value={fmtDate(lead.captured_at)}
            />
            {lead.source_msg_date ? (
              <Info
                label="Source date"
                value={fmtDate(lead.source_msg_date)}
              />
            ) : null}
            <div>
              <div className="k">Status</div>
              <StatusSelect leadId={lead.id} initial={lead.status} />
            </div>
            <div>
              <div className="k">Next follow-up</div>
              <div className="v">
                {lead.next_follow_up
                  ? fmtDate(lead.next_follow_up, {
                      relative: true,
                      withTime: true,
                      
                    })
                  : "—"}
                {state?.kind === "overdue" ? (
                  <span className="chip chip-overdue" style={{ marginLeft: 8 }}>
                    {state.label}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {lead.source_message ? (
            <details className="collapsible">
              <summary>
                <ChevronRight size={14} aria-hidden /> Source message
              </summary>
              <div className="source">
                <div className="from">
                  <MessageCircle size={14} aria-hidden />
                  {lead.source_from ?? "—"}
                  {lead.source_msg_date
                    ? ` · ${fmtDate(lead.source_msg_date)}`
                    : null}
                </div>
                &ldquo;{lead.source_message}&rdquo;
              </div>
            </details>
          ) : null}

          <div className="history">
            <h3>
              History · {history.length}{" "}
              {history.length === 1 ? "entry" : "entries"}
            </h3>
            {history.length === 0 ? (
              <div className="empty">
                No calls logged yet. This will be the first contact.
              </div>
            ) : (
              history.map((h) => (
                <div key={h.id} className="history-item">
                  <div className="dot" />
                  <div className="body">
                    <div className="top">
                      <span className="outcome">
                        {h.outcome ? OUTCOME_LABELS[h.outcome] : h.type}
                      </span>
                      <span className="when">
                        {fmtDate(h.created_at, { relative: true })} at{" "}
                        {fmtTime(h.created_at)}
                      </span>
                    </div>
                    {h.notes ? <div className="notes">{h.notes}</div> : null}
                    <div className="by">
                      Logged by {h.creator?.full_name ?? h.creator?.email ?? "Unknown"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="detail-sidebar">
          <CallLogForm
            leadId={lead.id}
            confidence={lead.confidence}
            followUpCount={lead.follow_up_count}
          />
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="k">{label}</div>
      <div className="v">{value ?? "—"}</div>
    </div>
  );
}
