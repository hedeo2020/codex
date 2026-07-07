import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireEmployeeUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export default async function HistoryPage() {
  const { user } = await requireEmployeeUser();
  const records = await db.attendanceRecord.findMany({
    where: { userId: user.id },
    orderBy: { eventTime: "desc" },
    take: 100
  });

  return (
    <div className="shell">
      <Sidebar active="My history" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.jobTitle ?? "Employee"} />
      <main className="main">
        <Header eyebrow="Attendance history" title="Your attendance records" subtitle="Verified events from the live system." />
        <section className="card">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event</th>
                <th>Method</th>
                <th>Status</th>
                <th>Timezone</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{formatDateTime(record.eventTime)}</td>
                  <td>{record.attendanceType.replaceAll("_", " ")}</td>
                  <td>{record.verificationMethod.replaceAll("_", " ")}</td>
                  <td><span className="badge">{record.verificationStatus.replaceAll("_", " ")}</span></td>
                  <td>{record.timezone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
