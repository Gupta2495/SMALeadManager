import Link from "next/link";
import { StatusChip } from "@/components/StatusChip";
import { fmtDate } from "@/lib/date";
import { formatPhoneDisplay } from "@/lib/phoneFormat";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/lib/types";

export const metadata = { title: "All leads · Madhav Leads" };

type SP = Promise<{ q?: string; status?: string }>;

export default async function LeadsListPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const { supabase } = await getCurrentProfile();
  const { q, status } = await searchParams;

  let query = supabase
    .from("leads")
    .select("*")
    .order("captured_at", { ascending: false })
    .limit(200);

  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) {
    query = query.eq("status", status as LeadStatus);
  }
  if (q && q.trim()) {
    const pattern = `%${q.trim()}%`;
    query = query.or(
      `student_name.ilike.${pattern},parent_name.ilike.${pattern},phone.ilike.${pattern}`,
    );
  }

  const { data: leads } = await query.returns<Lead[]>();
  const rows = leads ?? [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">All leads</h1>
          <p className="page-sub">Search and filter across every captured lead.</p>
        </div>
        <Link href="/leads/new" className="btn btn-primary">
          + New lead
        </Link>
      </div>

      <form method="get" className="toolbar">
        <label className="search-wrap" aria-label="Search">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            name="q"
            defaultValue={q ?? ""}
            className="input"
            placeholder="Search by name or phone"
          />
        </label>
        <select name="status" defaultValue={status ?? ""} className="select">
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-secondary">Apply</button>
      </form>

      <p className="result-count">
        {rows.length} {rows.length === 1 ? "lead" : "leads"}
      </p>

      {rows.length > 0 ? (
        <div className="table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Parent</th>
                <th>Class</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Captured</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/leads/${lead.id}`} className="student">
                      {lead.student_name ?? "—"}
                    </Link>
                    {lead.location ? (
                      <div className="muted">{lead.location}</div>
                    ) : null}
                  </td>
                  <td>{lead.parent_name ?? "—"}</td>
                  <td>{lead.class_label ?? "—"}</td>
                  <td>{formatPhoneDisplay(lead.phone)}</td>
                  <td>
                    <StatusChip status={lead.status} />
                  </td>
                  <td className="muted">
                    {fmtDate(lead.captured_at, { relative: true, noYear: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty">No leads match the current filter.</div>
      )}
    </>
  );
}
