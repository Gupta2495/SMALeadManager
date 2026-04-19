import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { Lead } from "@/lib/types";
import { EditLeadForm } from "./edit-lead-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: `Edit lead · ${id.slice(0, 8)} · Madhav Leads` };
}

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await getCurrentProfile();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single<Lead>();

  if (!lead) notFound();

  const displayName = lead.student_name ?? lead.parent_name ?? "Unknown";

  return (
    <>
      <Link href={`/leads/${id}`} className="back-link">
        <ArrowLeft size={16} aria-hidden /> Back to lead
      </Link>

      <div className="page-header">
        <div>
          <h1 className="page-title">Edit lead</h1>
          <p className="page-sub">{displayName}</p>
        </div>
      </div>

      <EditLeadForm lead={lead} />
    </>
  );
}
