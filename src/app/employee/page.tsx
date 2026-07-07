import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { requireEmployeeUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatTime } from "@/lib/format";

export default async function EmployeeDashboard() {
  const { user } = await requireEmployeeUser();
  const recentRecords = await db.attendanceRecord.findMany({
    where: { userId: user.id },
    orderBy: { eventTime: "desc" },
    take: 4
  });

  const monthlyCount = await db.attendanceRecord.count({
    where: {
      userId: user.id,
      attendanceType: "CHECK_IN",
      eventTime: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    }
  });

  const lastCheckIn = recentRecords.find((record) => record.attendanceType === "CHECK_IN");
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <div className="shell">
      <Sidebar active="Overview" userName={name} userSubtitle={user.jobTitle ?? "Employee"} />
      <main className="main">
        <Header
          eyebrow={formatDate(new Date())}
          title={`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${user.firstName}.`}
          subtitle="Here’s your live attendance snapshot."
          status={user.preferredAttendanceMethod.replaceAll("_", " ")}
        />

        <section className="hero-card">
          <div>
            <div className="eyebrow" style={{ color: "#cce69b" }}>Current status</div>
            <h2>{lastCheckIn ? `Last check-in at ${formatTime(lastCheckIn.eventTime)}` : "No check-in recorded today yet"}</h2>
            <p style={{ color: "#cce0d7" }}>{user.location?.name ?? "Assigned location"} · {user.preferredAttendanceMethod.replaceAll("_", " ")}</p>
            <div className="actions">
              <Link className="btn" href="/employee/attendance">Record attendance</Link>
              <Link className="btn soft" href="/employee/history">Open history</Link>
            </div>
          </div>
          <div className="status-ring">
            <span>
              <strong style={{ fontSize: 18 }}>{monthlyCount}</strong>
              <br />
              check-ins this month
            </span>
          </div>
        </section>

        <div className="grid4">
          <div className="stat">
            <div className="stathead">Shift</div>
            <div className="statvalue">{user.shift?.name ?? "Not assigned"}</div>
            <div className="delta">{user.shift ? `${user.shift.startTime} - ${user.shift.endTime}` : "Ask HR to assign a shift"}</div>
          </div>
          <div className="stat">
            <div className="stathead">Department</div>
            <div className="statvalue">{user.department?.name ?? "Unassigned"}</div>
            <div className="muted" style={{ fontSize: 12 }}>{user.jobTitle ?? "Employee"}</div>
          </div>
          <div className="stat">
            <div className="stathead">Biometric status</div>
            <div className="statvalue">{user.biometricProfile?.enrollmentStatus?.replaceAll("_", " ") ?? "NOT ENROLLED"}</div>
            <div className="muted" style={{ fontSize: 12 }}>{user.biometricProfile?.consentStatus ? "Consent on file" : "Consent not granted"}</div>
          </div>
          <div className="stat">
            <div className="stathead">Attendance records</div>
            <div className="statvalue">{recentRecords.length}</div>
            <div className="muted" style={{ fontSize: 12 }}>Most recent records shown below</div>
          </div>
        </div>

        <section className="layout2">
          <div className="card">
            <div className="cardhead">
              <div>
                <h2>Recent attendance</h2>
                <span className="muted">Your latest recorded events</span>
              </div>
              <Link className="btn" href="/employee/history">View all</Link>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Event</th>
                  <th>Time</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.eventTime)}</td>
                    <td>{record.attendanceType.replaceAll("_", " ")}</td>
                    <td>{formatTime(record.eventTime)}</td>
                    <td>{record.verificationMethod.replaceAll("_", " ")}</td>
                    <td><span className="badge">{record.verificationStatus.replaceAll("_", " ")}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <aside className="card">
            <div className="cardhead">
              <div>
                <h2>Face profile</h2>
                <span className="muted">Your privacy controls</span>
              </div>
              <span className={`badge ${user.biometricProfile?.consentStatus ? "" : "gray"}`}>{user.biometricProfile?.consentStatus ? "Consent active" : "No consent"}</span>
            </div>
            <div className="notice">
              {user.biometricProfile?.expiresAt
                ? `Biometric profile expires on ${formatDate(user.biometricProfile.expiresAt)}.`
                : "No biometric expiry is active yet."}
            </div>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <Link className="btn" href="/employee/biometrics">Manage consent</Link>
              <Link className="btn" href="/employee/profile">Update profile</Link>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
