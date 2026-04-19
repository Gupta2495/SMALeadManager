import { STATUS_META, type LeadStatus } from "@/lib/types";

export function StatusChip({ status }: { status: LeadStatus }) {
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span className="chip" style={{ background: meta.bg, color: meta.fg }}>
      {meta.label}
    </span>
  );
}
