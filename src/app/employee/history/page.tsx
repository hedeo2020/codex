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
        <section className="card glass">
          <div className="record-grid">
            {records.map((record) => (
              <article className="record-card" key={record.id}>
                {record.captureImageUrl ? <img src={record.captureImageUrl} alt={record.attendanceType} className="record-photo" /> : <div className="photo-placeholder">No image stored</div>}
                <div className="feed">
                  <div><strong>{record.attendanceType.replaceAll("_", " ")}</strong></div>
                  <small>{formatDateTime(record.eventTime)}</small>
                  <small>{record.captureLocationLabel ?? "Location unavailable"}</small>
                  <small>{record.latitude && record.longitude ? `${record.latitude.toString()}, ${record.longitude.toString()}` : "Coordinates unavailable"}</small>
                  <div><span className="badge">{record.verificationMethod.replaceAll("_", " ")}</span> <span className="badge gray">{record.verificationStatus.replaceAll("_", " ")}</span></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
