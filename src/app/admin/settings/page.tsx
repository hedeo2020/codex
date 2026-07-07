import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireAdminUser } from "@/lib/auth";
import { appEnv, biometricProviderReady } from "@/lib/env";

export default async function SettingsPage() {
  const { user } = await requireAdminUser();

  return (
    <div className="shell">
      <Sidebar mode="admin" active="Privacy & settings" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.role.name.replaceAll("_", " ")} />
      <main className="main">
        <Header eyebrow="Governance" title="Privacy & retention" subtitle="Live environment-backed settings for deployment review." />
        <div className="layout2">
          <section className="card">
            <h2>Retention periods</h2>
            <div className="feed">
              <div className="feedrow"><span className="doticon">B</span><div><strong>{appEnv.biometricRetentionDays} days</strong><small>Biometric template retention</small></div></div>
              <div className="feedrow"><span className="doticon">T</span><div><strong>{appEnv.tempImageRetentionMinutes} minutes</strong><small>Temporary capture retention</small></div></div>
              <div className="feedrow"><span className="doticon">A</span><div><strong>{appEnv.attendanceRetentionDays} days</strong><small>Attendance retention</small></div></div>
              <div className="feedrow"><span className="doticon">L</span><div><strong>{appEnv.auditRetentionDays} days</strong><small>Audit log retention</small></div></div>
            </div>
          </section>
          <aside className="card">
            <h2>Verification policy</h2>
            <div className="feed">
              <div className="feedrow"><span className="doticon">P</span><div><strong>{appEnv.biometricProvider}</strong><small>Biometric provider mode</small></div></div>
              <div className="feedrow"><span className="doticon">R</span><div><strong>{biometricProviderReady() ? "Ready" : "Not ready"}</strong><small>Provider connection state</small></div></div>
              <div className="feedrow"><span className="doticon">V</span><div><strong>{appEnv.verificationThreshold}</strong><small>Verification threshold</small></div></div>
              <div className="feedrow"><span className="doticon">M</span><div><strong>{appEnv.maxVerificationAttempts}</strong><small>Retry limit</small></div></div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
