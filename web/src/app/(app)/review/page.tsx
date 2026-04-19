import { notFound } from "next/navigation";
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
            Low-confidence extractions from the WhatsApp ingester. Promote or
            discard.
          </p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">Nothing to review. Ingester is cruising.</div>
      ) : (
        <div style={{ marginTop: 20 }}>
          {rows.map((lead) => (
            <div key={lead.id} className="review-row">
              <div className="review-fields">
                <div>
                  <div className="k">Student</div>
                  <div className="v">{lead.student_name ?? "—"}</div>
                </div>
                <div>
                  <div className="k">Parent</div>
                  <div className="v">{lead.parent_name ?? "—"}</div>
                </div>
                <div>
                  <div className="k">Phone</div>
                  <div className="v">{lead.phone}</div>
                </div>
                <div>
                  <div className="k">Class</div>
                  <div className="v">{lead.class_label ?? "—"}</div>
                </div>
                <div>
                  <div className="k">Interest</div>
                  <div className="v">{lead.interest ?? "—"}</div>
                </div>
                <div>
                  <div className="k">Location</div>
                  <div className="v">{lead.location ?? "—"}</div>
                </div>
                <div>
                  <div className="k">Captured</div>
                  <div className="v">
                    {fmtDate(lead.captured_at, { noYear: true })}
                  </div>
                </div>
                <div>
                  <div className="k">Confidence</div>
                  <div className="v">
                    <span className="review-conf">
                      {lead.confidence !== null
                        ? `${Math.round(lead.confidence * 100)}%`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {lead.source_message ? (
                <div className="review-msg">&ldquo;{lead.source_message}&rdquo;</div>
              ) : null}

              <ReviewActions leadId={lead.id} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
