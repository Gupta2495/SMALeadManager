import { getCurrentProfile } from "@/lib/supabase/profile";

export const metadata = { title: "Profile · Madhav Leads" };

export default async function ProfilePage() {
  const { user, profile } = await getCurrentProfile();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
        </div>
      </div>
      <div className="call-form-card" style={{ marginTop: 20, maxWidth: 420 }}>
        <div className="info-grid" style={{ borderTop: 0, borderBottom: 0, padding: 0 }}>
          <div>
            <div className="k">Name</div>
            <div className="v">{profile?.full_name ?? "—"}</div>
          </div>
          <div>
            <div className="k">Email</div>
            <div className="v">{user.email ?? "—"}</div>
          </div>
          <div>
            <div className="k">Role</div>
            <div className="v">{profile?.role ?? "caller"}</div>
          </div>
        </div>
        <form action="/auth/signout" method="post" style={{ marginTop: 20 }}>
          <button type="submit" className="btn btn-secondary">
            Sign out
          </button>
        </form>
      </div>
    </>
  );
}
