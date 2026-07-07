import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";

export default async function AuditPage() {
  const { user } = await requireAdminUser();
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="shell">
      <Sidebar mode="admin" active="Audit logs" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.role.name.replaceAll("_", " ")} />
      <main className="main">
        <Header eyebrow="Immutable history" title="Audit log" subtitle="Security, attendance, consent, and administrative actions." />
        <section className="card">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDateTime(log.createdAt)}</td>
                  <td>{log.actorUserId ?? "System"}</td>
                  <td>{log.action}</td>
                  <td>{log.entityType}</td>
                  <td>{log.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
