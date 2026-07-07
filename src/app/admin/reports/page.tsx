import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ReportsPage() {
  const { user } = await requireAdminUser();
  const [dailyAttendance, pinCount, faceCount, exceptions] = await Promise.all([
    db.attendanceRecord.count({ where: { eventTime: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    db.attendanceRecord.count({ where: { verificationMethod: "PIN" } }),
    db.attendanceRecord.count({ where: { verificationMethod: "FACE" } }),
    db.attendanceRecord.count({ where: { verificationStatus: { not: "SUCCESS" } } })
  ]);

  return (
    <div className="shell">
      <Sidebar mode="admin" active="Reports" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.role.name.replaceAll("_", " ")} />
      <main className="main">
        <Header eyebrow="Analysis, not scoring" title="Reports" subtitle="Operational attendance reporting without exposing biometric templates." />
        <div className="grid4">
          {[
            ["Events today", dailyAttendance],
            ["PIN records", pinCount],
            ["Face records", faceCount],
            ["Exceptions", exceptions]
          ].map(([label, value]) => (
            <div className="stat" key={label}>
              <div className="stathead">{label}</div>
              <div className="statvalue">{value}</div>
            </div>
          ))}
        </div>
        <section className="card" style={{ marginTop: 18 }}>
          <h2>Report scope</h2>
          <div className="notice">
            This build now reports on live attendance and verification metadata. Export automation can be added next, but the data model and server queries are already live.
          </div>
        </section>
      </main>
    </div>
  );
}
