// Domain types and enum-like constants shared between the web app and the
// Supabase schema. Keep these in lockstep with supabase/schema.sql — adding
// a new status here means updating the DB enum too.

export type Role = "admin" | "caller";

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "visited",
  "on_hold",
  "admitted",
  "rejected",
  "lost",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const INTERACTION_TYPES = [
  "call",
  "whatsapp_in",
  "whatsapp_out",
  "note",
  "status_change",
  "visit",
] as const;
export type InteractionType = (typeof INTERACTION_TYPES)[number];

export const CALL_OUTCOMES = [
  "no_answer",
  "busy",
  "interested",
  "not_interested",
  "callback_requested",
  "visit_scheduled",
  "admitted",
  "lost",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export const CLASSES = [
  "Nursery", "LKG", "UKG",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12",
] as const;

export const INTERESTS = [
  "Admission", "Fee structure", "Transport",
  "Hostel", "Scholarship", "Curriculum", "Visit",
] as const;

export type StatusMeta = { label: string; bg: string; fg: string; filled: boolean };

export const STATUS_META: Record<LeadStatus, StatusMeta> = {
  new:        { label: "New",        bg: "#DBEAFE", fg: "#1E40AF", filled: false },
  contacted:  { label: "Contacted",  bg: "#EDE9FE", fg: "#6D28D9", filled: false },
  interested: { label: "Interested", bg: "#D1FAE5", fg: "#047857", filled: false },
  visited:    { label: "Visited",    bg: "#CCFBF1", fg: "#0F766E", filled: false },
  on_hold:    { label: "On hold",    bg: "#E5E7EB", fg: "#4B5563", filled: false },
  admitted:   { label: "Admitted",   bg: "#065F46", fg: "#FFFFFF", filled: true  },
  rejected:   { label: "Rejected",   bg: "#991B1B", fg: "#FFFFFF", filled: true  },
  lost:       { label: "Lost",       bg: "#374151", fg: "#FFFFFF", filled: true  },
};

export const OUTCOME_LABELS: Record<CallOutcome, string> = {
  no_answer:          "No answer",
  busy:               "Busy",
  interested:         "Interested",
  not_interested:     "Not interested",
  callback_requested: "Callback requested",
  visit_scheduled:    "Visit scheduled",
  admitted:           "Admitted",
  lost:               "Lost",
};

export type Lead = {
  id: string;
  lead_id: string | null;
  phone: string;
  parent_name: string | null;
  student_name: string | null;
  class_label: string | null;
  interest: string | null;
  location: string | null;
  notes: string;
  status: LeadStatus;
  assigned_to: string | null;
  captured_at: string;
  source_msg_date: string | null;
  source_message: string | null;
  source_from: string | null;
  confidence: number | null;
  next_follow_up: string | null;
  follow_up_count: number;
  last_contact_at: string | null;
  last_outcome: CallOutcome | null;
  needs_review: boolean;
  created_at: string;
  updated_at: string;
};

export type Interaction = {
  id: string;
  lead_id: string;
  type: InteractionType;
  outcome: CallOutcome | null;
  channel: string | null;
  notes: string | null;
  duration_seconds: number | null;
  next_follow_up: string | null;
  created_by: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  created_at: string;
};
