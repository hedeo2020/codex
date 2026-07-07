import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireAdminUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function EnrollmentsPage() {
  const { user } = await requireAdminUser();
  const profiles = await db.biometricProfile.findMany({
    include: { user: true },
    orderBy: { updatedAt: "desc" }
  });

  return (
    <div className="shell">
      <Sidebar mode="admin" active="Enrollments" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.role.name.replaceAll("_", " ")} />
      <main className="main">
        <Header eyebrow="Restricted access" title="Facial enrollment" subtitle="Manage status and consent without exposing or downloading templates." />
        <section className="card">
          <div className="notice">Templates remain encrypted and non-exportable. This page only exposes enrollment status, consent, expiry, and last verification metadata.</div>
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Status</th>
                <th>Consent</th>
                <th>Expires</th>
                <th>Last verified</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr key={profile.id}>
                  <td>{profile.user.firstName} {profile.user.lastName}</td>
                  <td><span className={`badge ${profile.enrollmentStatus === "ACTIVE" ? "" : profile.enrollmentStatus === "PENDING" ? "warn" : "gray"}`}>{profile.enrollmentStatus.replaceAll("_", " ")}</span></td>
                  <td>{profile.consentStatus ? `Yes · ${profile.consentDocumentVersion ?? "current"}` : "No"}</td>
                  <td>{profile.expiresAt ? formatDate(profile.expiresAt) : "—"}</td>
                  <td>{profile.lastVerifiedAt ? formatDate(profile.lastVerifiedAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
