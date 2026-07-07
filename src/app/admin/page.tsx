import Link from "next/link";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export default async function AdminDashboard() {
  const { user } = await requireAdminUser();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [activeEmployees, checkedInToday, pendingCorrections, pendingPrivacy, recentAttendance] = await Promise.all([
    db.user.count({ where: { deletedAt: null, employmentStatus: "ACTIVE", role: { name: "EMPLOYEE" } } }),
    db.attendanceRecord.count({ where: { attendanceType: "CHECK_IN", eventTime: { gte: startOfToday } } }),
    db.attendanceCorrectionRequest.count({ where: { status: "PENDING" } }),
    db.privacyRequest.count({ where: { status: "PENDING" } }),
    db.attendanceRecord.findMany({
      include: { user: true },
      orderBy: { eventTime: "desc" },
      take: 6
    })
  ]);

  return (
    <div className="shell">
      <Sidebar mode="admin" active="Dashboard" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.role.name.replaceAll("_", " ")} />
      <main className="main">
        <Header eyebrow="Operations overview" title="Attendance at a glance" subtitle="Live operational signals, with exceptions routed to human review." />
        <div className="grid4">
          <div className="stat"><div className="stathead">Active employees</div><div className="statvalue">{activeEmployees}</div><div className="delta">Current active roster</div></div>
          <div className="stat"><div className="stathead">Checked in today</div><div className="statvalue">{checkedInToday}</div><div className="delta">Successful check-ins since midnight</div></div>
          <div className="stat"><div className="stathead">Correction queue</div><div className="statvalue">{pendingCorrections}</div><div className="muted" style={{ fontSize: 12 }}>Attendance corrections awaiting review</div></div>
          <div className="stat"><div className="stathead">Privacy requests</div><div className="statvalue">{pendingPrivacy}</div><div className="muted" style={{ fontSize: 12 }}>Human action required</div></div>
        </div>

        <section className="layout2">
          <div className="card">
            <div className="cardhead">
              <div>
                <h2>Latest attendance</h2>
                <span className="muted">Newest recorded events across the system</span>
              </div>
              <Link className="btn" href="/admin/attendance">Open attendance</Link>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Event</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentAttendance.map((record) => (
                  <tr key={record.id}>
                    <td>{record.user.firstName} {record.user.lastName}</td>
                    <td>{record.attendanceType.replaceAll("_", " ")}</td>
                    <td>{record.verificationMethod.replaceAll("_", " ")}</td>
                    <td><span className="badge">{record.verificationStatus.replaceAll("_", " ")}</span></td>
                    <td>{formatDateTime(record.eventTime)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="card">
            <div className="cardhead">
              <div>
                <h2>Next actions</h2>
                <span className="muted">Operational focus points</span>
              </div>
            </div>
            <div className="feed">
              <div className="feedrow"><span className="doticon">1</span><div><strong>Review pending corrections</strong><small>{pendingCorrections} records awaiting a decision</small></div><Link href="/admin/attendance">Open</Link></div>
              <div className="feedrow"><span className="doticon">2</span><div><strong>Check privacy requests</strong><small>{pendingPrivacy} requests require response</small></div><Link href="/admin/settings">Open</Link></div>
              <div className="feedrow"><span className="doticon">3</span><div><strong>Confirm provider setup</strong><small>Use the settings page to review live biometric parameters</small></div><Link href="/admin/settings">Open</Link></div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
