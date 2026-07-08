import { EmployeeBiometricControls } from "@/components/EmployeeBiometricControls";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { requireEmployeeUser } from "@/lib/auth";
import { appEnv, biometricProviderReady } from "@/lib/env";
import { formatDate } from "@/lib/format";

export default async function BiometricsPage() {
  const { user } = await requireEmployeeUser();
  const profile = user.biometricProfile;

  return (
    <div className="shell">
      <Sidebar active="Face & consent" userName={`${user.firstName} ${user.lastName}`} userSubtitle={user.jobTitle ?? "Employee"} />
      <main className="main">
        <Header eyebrow="Privacy center" title="Your face, your choice" subtitle="Consent, retention, and deletion controls stay visible to the employee." />
        <div className="layout2">
          <section className="card glass">
            <div className="cardhead">
              <div>
                <h2>Biometric profile</h2>
                <p className="muted">Provider mode: {appEnv.biometricProvider}</p>
              </div>
              <span className={`badge ${profile?.consentStatus ? "" : "gray"}`}>{profile?.enrollmentStatus?.replaceAll("_", " ") ?? "NOT ENROLLED"}</span>
            </div>
            <div className="hero-strip">
              <div className="metric"><strong>Consent</strong><div className="muted">{profile?.consentStatus ? "Recorded" : "Not recorded"}</div></div>
              <div className="metric"><strong>Provider</strong><div className="muted">{biometricProviderReady() ? "Connected" : "Needs setup"}</div></div>
              <div className="metric"><strong>Expiry</strong><div className="muted">{profile?.expiresAt ? formatDate(profile.expiresAt) : "No expiry set"}</div></div>
            </div>
            <div className="feed" style={{ marginTop: 18 }}>
              <div className="feedrow"><span className="doticon">✓</span><div><strong>Explicit consent</strong><small>{profile?.consentStatus ? "Recorded" : "Not recorded"}</small></div></div>
              <div className="feedrow"><span className="doticon">P</span><div><strong>Provider readiness</strong><small>{biometricProviderReady() ? "Connected for verification" : "Provider still needs production setup"}</small></div></div>
              <div className="feedrow"><span className="doticon">E</span><div><strong>Expiry</strong><small>{profile?.expiresAt ? formatDate(profile.expiresAt) : "No expiry set"}</small></div></div>
            </div>
          </section>
          <aside className="card glass">
            <h2>Your controls</h2>
            <p className="muted">Open this only when you want to grant consent, capture a face frame, enroll, or remove your biometric profile.</p>
            <EmployeeBiometricControls
              consentStatus={Boolean(profile?.consentStatus)}
              canEnroll={appEnv.biometricProvider === "local-face" && biometricProviderReady()}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
