import { Header } from "@/components/Header";
import { ProfileForm } from "@/components/ProfileForm";
import { Sidebar } from "@/components/Sidebar";
import { requireEmployeeUser } from "@/lib/auth";

export default async function ProfilePage() {
  const { user } = await requireEmployeeUser();
  const preferredAttendanceMethod =
    user.preferredAttendanceMethod === "MANUAL_CORRECTION" ? "ADMIN_ASSISTED" : user.preferredAttendanceMethod;

  return (
    <div className="shell">
      <Sidebar active="My profile" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.jobTitle ?? "Employee"} />
      <main className="main">
        <Header eyebrow="Profile" title="Your account details" subtitle="Keep your photo, contact details, and attendance preference current." />
        <div className="layout2">
          <section className="card glass">
            <div className="cardhead">
              <div>
                <h2>Contact and attendance preferences</h2>
                <p className="muted">These are the account details you manage yourself.</p>
              </div>
            </div>
            <ProfileForm
              personalEmail={user.personalEmail ?? ""}
              mobile={user.mobile ?? ""}
              profilePhotoUrl={user.profilePhotoUrl ?? ""}
              preferredAttendanceMethod={preferredAttendanceMethod}
            />
          </section>
          <aside className="card glass">
            <h2>Company-managed fields</h2>
            <div className="feed">
              <div className="feedrow"><span className="doticon">ID</span><div><strong>{user.employeeId}</strong><small>Employee identifier</small></div></div>
              <div className="feedrow"><span className="doticon">R</span><div><strong>{user.role.name.replaceAll("_", " ")}</strong><small>Assigned access role</small></div></div>
              <div className="feedrow"><span className="doticon">S</span><div><strong>{user.shift?.name ?? "Not assigned"}</strong><small>Shift assignment</small></div></div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
