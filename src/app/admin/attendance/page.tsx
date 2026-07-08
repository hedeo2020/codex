import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export default async function AdminAttendancePage() {
  const { user } = await requireAdminUser();
  const records = await db.attendanceRecord.findMany({
    include: { user: true, location: true },
    orderBy: { eventTime: "desc" },
    take: 100
  });

  return (
    <div className="shell">
      <Sidebar mode="admin" active="Attendance" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.role.name.replaceAll("_", " ")} />
      <main className="main">
        <Header eyebrow="Operations" title="Attendance records" subtitle="Live attendance history across the organization." />
        <section className="card">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Employee</th>
                <th>Event</th>
                <th>Method</th>
                <th>Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{formatDateTime(record.eventTime)}</td>
                  <td>{record.user.firstName} {record.user.lastName}</td>
                  <td>{record.attendanceType.replaceAll("_", " ")}</td>
                  <td>{record.verificationMethod.replaceAll("_", " ")}</td>
                  <td><span className="badge">{record.verificationStatus.replaceAll("_", " ")}</span></td>
                  <td>{record.captureLocationLabel ?? record.location?.name ?? "Not captured"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
