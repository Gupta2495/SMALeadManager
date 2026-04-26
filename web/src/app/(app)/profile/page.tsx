import { getCurrentProfile } from "@/lib/supabase/profile";
import { CreateUserForm } from "./CreateUserForm";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Profile · Madhav Leads" };

export default async function ProfilePage() {
  const { supabase, user, profile } = await getCurrentProfile();
  const isAdmin = profile?.role === "admin";

  let users: Profile[] = [];
  if (isAdmin) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<Profile[]>();
    users = data ?? [];
  }

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

      {isAdmin && (
        <>
          <h2 className="section-title" style={{ marginTop: 32, marginBottom: 12 }}>
            Add a new user
          </h2>
          <div className="call-form-card" style={{ maxWidth: 420 }}>
            <CreateUserForm />
          </div>

          <h2 className="section-title" style={{ marginTop: 32, marginBottom: 12 }}>
            Team ({users.length})
          </h2>
          <div className="call-form-card" style={{ maxWidth: 600, padding: 0, overflow: "hidden" }}>
            <div className="table-wrap" style={{ border: 0, borderRadius: 0, marginTop: 0 }}>
              <table className="leads-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.email ?? "—"}</td>
                      <td>{u.full_name ?? "—"}</td>
                      <td>
                        <span
                          className="chip"
                          style={{
                            background: u.role === "admin" ? "#EEF2FF" : "var(--n100)",
                            color: u.role === "admin" ? "var(--primary)" : "var(--n700)",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}
