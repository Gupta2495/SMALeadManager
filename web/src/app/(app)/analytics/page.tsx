import Link from "next/link";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Lead } from "@/lib/types";
import { followUpState } from "@/lib/date";

export const metadata = { title: "Analytics · Madhav Leads" };

export default async function AnalyticsPage() {
  const { supabase } = await getCurrentProfile();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .returns<Lead[]>();

  const rows = leads ?? [];
  const total = rows.length;
  const admitted = rows.filter((l) => l.status === "admitted").length;
  const lost = rows.filter((l) => l.status === "lost").length;
  const active = rows.filter(
    (l) => !["admitted", "lost", "rejected", "on_hold"].includes(l.status),
  ).length;
  const overdue = rows.filter(
    (l) => followUpState(l.next_follow_up)?.kind === "overdue",
  ).length;
  const dueToday = rows.filter(
    (l) => followUpState(l.next_follow_up)?.kind === "due",
  ).length;
  const needsReview = rows.filter((l) => l.needs_review).length;
  const conversion = total > 0 ? Math.round((admitted / total) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-sub">
            Snapshot of the lead pipeline for Shree Madhav Academy.
          </p>
        </div>
      </div>

      <div className="tile-grid">
        <Tile label="Total leads" value={total} />
        <Tile label="Active pipeline" value={active} />
        <Tile label="Admitted" value={admitted} sub={`${conversion}% conversion`} subClass="good" />
        <Tile label="Lost" value={lost} />
        <Tile
          label="Overdue"
          value={overdue}
          sub={overdue > 0 ? "Needs attention" : "All caught up"}
          subClass={overdue > 0 ? "bad" : "good"}
          href="/?filter=overdue"
        />
        <Tile label="Due today" value={dueToday} />
        <Tile label="Needs review" value={needsReview} href="/review" />
        <Tile label="Follow-ups logged" value={rows.reduce((a, l) => a + l.follow_up_count, 0)} />
      </div>

      <div className="insights">
        <h3>Top locations</h3>
        {topByField(rows, "location").map(([k, v]) => (
          <div key={k} className="insight-row">
            <span className="k">{k}</span>
            <span className="v">{v}</span>
          </div>
        ))}
      </div>

      <div className="insights">
        <h3>Top interests</h3>
        {topByField(rows, "interest").map(([k, v]) => (
          <div key={k} className="insight-row">
            <span className="k">{k}</span>
            <span className="v">{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  sub,
  subClass,
  href,
}: {
  label: string;
  value: number;
  sub?: string;
  subClass?: "good" | "bad";
  href?: string;
}) {
  const body = (
    <div className={`tile ${href ? "link" : ""}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub ? <div className={`tile-sub ${subClass ?? ""}`}>{sub}</div> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function topByField(
  rows: Lead[],
  field: "location" | "interest",
  limit = 5,
): [string, number][] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const v = r[field];
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}
