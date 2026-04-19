import { LeadCard } from "@/components/LeadCard";
import { followUpState } from "@/lib/date";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Lead } from "@/lib/types";

export const metadata = { title: "Today · Madhav Leads" };

const CLOSED_STATUSES = ["admitted", "lost", "rejected", "on_hold"] as const;

export default async function DashboardPage() {
  const { supabase, user } = await getCurrentProfile();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("captured_at", { ascending: false })
    .returns<Lead[]>();

  const { overdue, dueToday, newLeads } = splitLeads(leads ?? []);
  const totalToCall = overdue.length + dueToday.length;
  const displayName = user.email?.split("@")[0] ?? "there";

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {displayName}</h1>
          <div className="summary-strip">
            <span>
              <strong>{totalToCall}</strong> calls to make today
            </span>
            {overdue.length > 0 ? (
              <span className="pill red">{overdue.length} overdue</span>
            ) : null}
            {newLeads.length > 0 ? (
              <span className="pill blue">{newLeads.length} new</span>
            ) : null}
          </div>
        </div>
      </div>

      {overdue.length > 0 ? (
        <Section label="Overdue" variant="overdue" items={overdue} />
      ) : null}
      {dueToday.length > 0 ? (
        <Section label="Due today" variant="due" items={dueToday} />
      ) : null}
      <Section
        label="New leads"
        variant="new"
        items={newLeads}
        emptyMessage="No new leads today."
      />
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
  variant: "overdue" | "due" | "new";
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
  overdue: Lead[];
  dueToday: Lead[];
  newLeads: Lead[];
} {
  const overdue: Lead[] = [];
  const dueToday: Lead[] = [];
  const newLeads: Lead[] = [];

  for (const lead of leads) {
    if (CLOSED_STATUSES.includes(lead.status as (typeof CLOSED_STATUSES)[number])) {
      continue;
    }
    const state = followUpState(lead.next_follow_up);
    if (state?.kind === "overdue") {
      overdue.push(lead);
    } else if (state?.kind === "due") {
      dueToday.push(lead);
    } else if (lead.status === "new") {
      newLeads.push(lead);
    }
  }

  overdue.sort(
    (a, b) =>
      new Date(a.next_follow_up ?? 0).getTime() -
      new Date(b.next_follow_up ?? 0).getTime(),
  );

  return { overdue, dueToday, newLeads };
}
