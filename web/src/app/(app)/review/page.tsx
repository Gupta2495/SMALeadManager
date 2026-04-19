import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Lead } from "@/lib/types";
import { fmtDate } from "@/lib/date";
import { ReviewActions } from "./review-actions";

export const metadata = { title: "Review · Madhav Leads" };

export default async function ReviewPage() {
  const { supabase, profile } = await getCurrentProfile();
  if (profile?.role !== "admin") notFound();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .eq("needs_review", true)
    .order("captured_at", { ascending: false })
    .returns<Lead[]>();

  const rows = leads ?? [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Review queue</h1>
          <p className="page-sub">
            Incomplete or unverified leads. Edit to fill missing info, then
            Promote to move into the main pipeline — or Discard to delete.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">Nothing to review. Ingester is cruising.</div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {rows.map((lead) => {
            const isDraft = lead.phone.startsWith("NOPHONE-");
            return (
              <div key={lead.id} className="review-row">
                <div className="review-fields">
                  <div>
                    <div className="k">Student</div>
                    <div className="v">
                      <Link href={`/leads/${lead.id}`} style={{ color: "inherit" }}>
                        {lead.student_name ?? "—"}
                      </Link>
                    </div>
                  </div>
                  <div>
                    <div className="k">Parent</div>
                    <div className="v">{lead.parent_name ?? "—"}</div>
                  </div>
                  <div>
                    <div className="k">Phone</div>
                    <div className="v">
                      {isDraft ? (
                        <span style={{ color: "var(--n400)", fontStyle: "italic" }}>Missing</span>
                      ) : (
                        lead.phone
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="k">Class</div>
                    <div className="v">{lead.class_label ?? "—"}</div>
                  </div>
                  <div>
                    <div className="k">Location</div>
                    <div className="v">{lead.location ?? "—"}</div>
                  </div>
                  <div>
                    <div className="k">Source</div>
                    <div className="v">
                      {lead.source_from ?? "—"}
                      {lead.source_msg_date
                        ? ` · ${fmtDate(lead.source_msg_date)}`
                        : null}
                    </div>
                  </div>
                </div>

                {lead.notes ? (
                  <div className="review-msg">{lead.notes}</div>
                ) : null}

                <div className="review-actions">
                  <Link
                    href={`/leads/${lead.id}/edit`}
                    className="btn btn-secondary btn-sm"
                  >
                    <Pencil size={13} aria-hidden /> Edit
                  </Link>
                  <ReviewActions leadId={lead.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
