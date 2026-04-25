import Link from "next/link";
import { LeadCard } from "@/components/LeadCard";
import { followUpState, isOlderThanDays } from "@/lib/date";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Lead } from "@/lib/types";

export const metadata = { title: "Today · Madhav Leads" };

export default async function DashboardPage() {
  const { supabase, user } = await getCurrentProfile();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .not("status", "in", "(admitted,lost,rejected,on_hold)")
    .order("captured_at", { ascending: false })
    .returns<Lead[]>();

  const rows = leads ?? [];
  const staleNewLeadIds = rows
    .filter((lead) => lead.status === "new" && isOlderThanDays(lead.captured_at, 7))
    .map((lead) => lead.id);

  if (staleNewLeadIds.length > 0) {
    await supabase
      .from("leads")
      .update({ status: "to_be_contacted" })
      .in("id", staleNewLeadIds);
  }

  const { followUps, newLeads, toBeContacted } = splitLeads(rows);
  const displayName = user.email?.split("@")[0] ?? "there";

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {displayName}</h1>
          <div className="summary-strip">
            <span>
              <strong>{followUps.length}</strong> follow-ups today
            </span>
            {newLeads.length > 0 ? (
              <span className="pill blue">{newLeads.length} new</span>
            ) : null}
            {toBeContacted.length > 0 ? (
              <span className="pill amber">{toBeContacted.length} to contact</span>
            ) : null}
          </div>
        </div>
        <Link href="/leads/new" className="btn btn-primary">
          + New lead
        </Link>
      </div>

      {followUps.length > 0 ? (
        <Section label="Follow ups today" variant="due" items={followUps} />
      ) : null}
      <Section
        label="New leads"
        variant="new"
        items={newLeads}
        emptyMessage="No new leads."
      />
      {toBeContacted.length > 0 ? (
        <Section label="To be contacted" variant="to_be_contacted" items={toBeContacted} />
      ) : null}
    </>
  );
}

function Section({
  label,
  variant,
  items,
  emptyMessage,
}: {
  label: string;
  variant: "overdue" | "due" | "new" | "to_be_contacted";
  items: Lead[];
  emptyMessage?: string;
}) {
  return (
    <section className="section">
      <div className="section-header">
        <div className={`section-title ${variant}`}>
          <span className="dot" />
          {label}
          <span className="count">{items.length}</span>
        </div>
      </div>
      {items.length > 0 ? (
        <div className="section-list">
          {items.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      ) : emptyMessage ? (
        <div className="empty">{emptyMessage}</div>
      ) : null}
    </section>
  );
}

function splitLeads(leads: Lead[]): {
  followUps: Lead[];
  newLeads: Lead[];
  toBeContacted: Lead[];
} {
  const followUps: Lead[] = [];
  const newLeads: Lead[] = [];
  const toBeContacted: Lead[] = [];

  for (const lead of leads) {
    const state = followUpState(lead.next_follow_up);
    if (state?.kind === "overdue" || state?.kind === "due") {
      followUps.push(lead);
    } else if (lead.status === "new") {
      if (isOlderThanDays(lead.captured_at, 7)) toBeContacted.push(lead);
      else newLeads.push(lead);
    } else if (lead.status === "to_be_contacted") {
      toBeContacted.push(lead);
    }
  }

  // Oldest overdue first, then by follow-up date
  followUps.sort(
    (a, b) =>
      new Date(a.next_follow_up ?? 0).getTime() -
      new Date(b.next_follow_up ?? 0).getTime(),
  );

  // Oldest captured first (longest waiting)
  newLeads.sort(
    (a, b) =>
      new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
  );

  // Same — oldest first so longest-waiting surfaces at top
  toBeContacted.sort(
    (a, b) =>
      new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime(),
  );

  return { followUps, newLeads, toBeContacted };
}
