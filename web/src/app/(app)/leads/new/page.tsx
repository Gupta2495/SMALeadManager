import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewLeadForm } from "./new-lead-form";
import { getCurrentProfile } from "@/lib/supabase/profile";

export const metadata = { title: "New lead · Madhav Leads" };

export default async function NewLeadPage() {
  await getCurrentProfile();

  return (
    <>
      <Link href="/leads" className="back-link">
        <ArrowLeft size={16} aria-hidden /> Back to all leads
      </Link>
      <div className="page-header">
        <div>
          <h1 className="page-title">New lead</h1>
          <p className="page-sub">Add a lead captured by phone or in person.</p>
        </div>
      </div>
      <div className="call-form-card" style={{ marginTop: 20, maxWidth: 640 }}>
        <NewLeadForm />
      </div>
    </>
  );
}
